import { linter, lintGutter, type Diagnostic, type LintSource, forceLinting } from '@codemirror/lint'
import { LSPPlugin, type LSPClientExtension } from '@codemirror/lsp-client'
import { MapMode, StateEffect, StateField, type EditorState } from '@codemirror/state'
import type * as lsp from 'vscode-languageserver-protocol'

const setPublishedDiagnostics = StateEffect.define<Diagnostic[]>()

export function storeLspDiagnostics(plugin: LSPPlugin, lspDiags: lsp.Diagnostic[]) {
    const result: Diagnostic[] = []
    const { syncedDoc } = plugin

    for (const diag of lspDiags) {
        let from: number, to: number
        try {
            // adapted from the official implementation
            from = plugin.unsyncedChanges.mapPos(plugin.fromPosition(diag.range.start, plugin.syncedDoc))
            to = plugin.unsyncedChanges.mapPos(plugin.fromPosition(diag.range.end, plugin.syncedDoc))
        } catch (e) { continue }
        if (to > syncedDoc.length) continue

        const severity = severities[diag.severity ?? 0]
        const { message } = diag
        const source = diag.code ? `${diag.source ? `${diag.source}-` : ''}${diag.code}` : undefined
        result.push({
            from, to, severity, message, source,
        })
    }

    return setPublishedDiagnostics.of(result)
}

// the index 0 maps to something arbitrary as per spec
const severities = ['hint', 'error', 'warning', 'info', 'hint'] as const

const lspPublishedDiagnostics = StateField.define<Diagnostic[]>({
    create() { return [] },
    update(value, tr) {
        for (const e of tr.effects) {
            if (e.is(setPublishedDiagnostics)) {
                value = e.value
            }
        }
        return value
    }
})

const lspLinterSource: LintSource = view => {
    const plugin = LSPPlugin.get(view)
    if (!plugin) return []
    return getDiagnostics(plugin, view.state)
}

export function lspLinter(): LSPClientExtension {
    return {
        clientCapabilities: {
            textDocument: {
                // better-supported push-based diagnostics
                publishDiagnostics: {
                    relatedInformation: true,
                    codeDescriptionSupport: true,
                    dataSupport: true,
                    versionSupport: true,
                },
                // more ergonomic, pull-based diagnostics since 3.17.0
                // but t-l-s nor vtsls does not support this :(
                // update: notion's fork managed to implement this feature
                // diagnostics: {}
            },
        },

        notificationHandlers: {
            // NOTE: adapted from https://github.com/codemirror/lsp-client/blob/6.1.0/src/diagnostics.ts
            'textDocument/publishDiagnostics': (client, params: lsp.PublishDiagnosticsParams) => {
                const file = client.workspace.getFile(params.uri)
                if (!file || (params.version != null && params.version != file.version)) {
                    return false
                }
                const view = file.getView()
                if (!view) return false

                const plugin = LSPPlugin.get(view)
                if (!plugin) return false

                view.dispatch({
                    effects: storeLspDiagnostics(plugin, params.diagnostics),
                })
                forceLinting(view)
                return true
            }
        },

        editorExtension: [
            lspPublishedDiagnostics,
            lintGutter(),
            linter(lspLinterSource, {
                needsRefresh(update) {
                    return update.transactions.some(tr => tr.effects.some(e => e.is(setPublishedDiagnostics)))
                },
                autoPanel: true,
            }),
        ],
    }
}

async function getDiagnostics(plugin: LSPPlugin, state: EditorState) {
    const cs = plugin.unsyncedChanges
    plugin.client.sync()
    const diags = state.field(lspPublishedDiagnostics)
    const result: Diagnostic[] = []
    for (const { from: ff, to: tt, ...diag } of diags) {
        const from = cs.mapPos(ff, 1, MapMode.TrackDel)
        const to = cs.mapPos(tt, -1, MapMode.TrackDel)
        if (from != null && to != null) {
            result.push({ ...diag, from, to })
        }
    }
    return result
}