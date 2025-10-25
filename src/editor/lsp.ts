import { LSPClient, type Transport, languageServerExtensions } from '@codemirror/lsp-client'
import type { Extension } from '@codemirror/state'
import { EditorView, ViewPlugin } from '@codemirror/view'

import { lspLinter } from './diag'
import { createLanguageServer } from './vtsls'

export const basicTheme = EditorView.baseTheme({
    '&': {
        margin: '8px 0',
        height: 'calc(100dvh - 16px)',
        border: '1px solid #eee',
        background: '#f3f3f3',
        fontSize: '12px',
        '--fontMono': 'Fira Mono, monospace',
    },
    '.cm-scroller, .cm-lsp-documentation pre, .cm-lsp-signature-tooltip .cm-lsp-signature': {
        fontFamily: 'var(--font-mono)',
    },
    '.cm-lsp-documentation pre code': {
        fontFamily: 'inherit',
    },
})

function createTsTransport(): [Transport, () => void] {
    const { port1: portForCM, port2: portForLanguageServer } = new MessageChannel()

    const vtsls = createLanguageServer(portForLanguageServer, {
        extensionUri: window.origin + '/vtsls',
        settings: {
            typescript: {
                locale: 'zh-TW',
                // tsserver: {
                //   log: 'verbose',
                // },
            },
            'js/ts': {
                implicitProjectConfig: {
                    checkJs: true,
                }
            },
        },
    });

    // LS -> CM
    portForCM.onmessage = function (ev) {
        if (ev.data?.method?.indexOf('logMessage') >= 0) {
            console.warn(ev.data.params.message.replace(/\\n/g, '\n').replace(/\\\\/g, '\\'))
        } else {
            console.log('CM <--', ev.data)
        }
        const resp = JSON.stringify(ev.data)
        handlers.forEach((cb) => cb(resp))
    }

    vtsls.listen()

    let handlers = [] as ((value: string) => void)[]
    return [{
        send(message) {  // CM -> LS
            const payload = JSON.parse(message)
            console.log('CM -->', payload)
            portForCM.postMessage(payload)
        },
        subscribe(handler) { handlers.push(handler) },
        unsubscribe(handler) { handlers = handlers.filter(h => h != handler) },
    }, vtsls.dispose.bind(vtsls)]
}

export const tsLspClient = function (languageId = 'javascript'): Extension {
    const mainFilePath = 'file:///workspace/index.ts'
    const [transport, disposeTsTransport] = createTsTransport()

    const lsextsWithoutLinter = languageServerExtensions().filter(ext => {
        if ((ext as any)?.clientCapabilities?.textDocument?.publishDiagnostics) return false
        return true
    })

    const client = new LSPClient({
        rootUri: '/workspace',
        extensions: [
            ...lsextsWithoutLinter,
            lspLinter(),
            {
                clientCapabilities: {
                    workspace: {
                        didChangeConfiguration: {},
                    },
                },
            },
        ],
    }).connect(transport)

    return [
        client.plugin(mainFilePath, languageId),
        // FIXME: (HMR) because the transport function is sync while the disposal is async
        // this cleanup is rigged and is bound to fail
        ViewPlugin.define(() => ({
            destroy: disposeTsTransport,
        })),
    ]
}