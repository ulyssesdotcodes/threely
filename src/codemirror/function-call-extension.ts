import { Extension, StateEffect } from '@codemirror/state'
import { EditorView, ViewUpdate } from '@codemirror/view'
import { Range } from '@codemirror/state'

import { FunctionCallTag, generateFunctionUUID } from './function-call-tag'
import { findAllFunctionCallsFlat } from './function-call-parser'
import { 
  addFunctionTagsEffect, 
  clearAllFunctionTagsEffect, 
  functionTagField,
  getFunctionTagsInRange,
  getAllFunctionTags
} from './function-call-state'
import { getBlockAtCursor } from '../codemirror'

export interface FunctionCallTaggingOptions {
  debounceMs?: number
  debug?: boolean
  maxBlockSize?: number
  tagAllBlocks?: boolean
}

const DEFAULT_OPTIONS: Required<FunctionCallTaggingOptions> = {
  debounceMs: 100,
  debug: false,
  maxBlockSize: 10000,
  tagAllBlocks: false
}

class Debouncer {
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  
  constructor(private delay: number) {}
  
  debounce(fn: () => void): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
    }
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null
      fn()
    }, this.delay)
  }
}

interface CodeBlock {
  text: string
  start: number
  end: number
}

function getCurrentCodeBlock(view: EditorView): CodeBlock | null {
  try {
    const blockInfo = getBlockAtCursor(view)
    if (!blockInfo || !blockInfo.block.trim()) {
      return null
    }
    
    const doc = view.state.doc.toString()
    const cursor = view.state.selection.main.head
    const startPos = getTextBlockStartPosition(doc, cursor)
    
    return {
      text: blockInfo.block,
      start: startPos,
      end: startPos + blockInfo.block.length
    }
  } catch {
    return null
  }
}

function getTextBlockStartPosition(text: string, cursorPos: number): number {
  let start = cursorPos
  while (start > 0) {
    if (text[start - 1] === '\n' && text[start] === '\n') {
      return start + 1
    }
    if (text[start - 1] === '\n' && start === 1) {
      return 0
    }
    start--
  }
  return 0
}

function getAllCodeBlocks(view: EditorView): CodeBlock[] {
  try {
    const doc = view.state.doc.toString()
    const blocks: CodeBlock[] = []
    const parts = doc.split(/\n\s*\n/)
    let currentPos = 0
    
    for (const part of parts) {
      const trimmed = part.trim()
      if (trimmed.length > 0) {
        const startIndex = doc.indexOf(trimmed, currentPos)
        if (startIndex !== -1) {
          blocks.push({
            text: trimmed,
            start: startIndex,
            end: startIndex + trimmed.length
          })
          currentPos = startIndex + trimmed.length
        }
      }
    }
    return blocks
  } catch {
    return []
  }
}

function tagFunctionCallsInBlock(
  block: CodeBlock,
  options: Required<FunctionCallTaggingOptions>
): Range<FunctionCallTag>[] {
  if (block.text.length > options.maxBlockSize) {
    return []
  }
  
  const functionCalls = findAllFunctionCallsFlat(block.text)
  const tags: Range<FunctionCallTag>[] = []
  const callCounts = new Map<string, number>()
  
  for (const call of functionCalls) {
    const currentCount = callCounts.get(call.name) || 0
    callCounts.set(call.name, currentCount + 1)
    
    const absoluteStart = block.start + call.start
    
    const uuid = generateFunctionUUID({
      functionName: call.name,
      position: absoluteStart,
      callIndex: currentCount
    })
    
    const tag = new FunctionCallTag(uuid, call.name, currentCount)
    const range = tag.range(absoluteStart, block.start + call.end)
    tags.push(range)
  }
  
  return tags
}

function refreshFunctionCallTags(view: EditorView, options: Required<FunctionCallTaggingOptions>): void {
  try {
    const blocks = options.tagAllBlocks 
      ? getAllCodeBlocks(view) 
      : [getCurrentCodeBlock(view)].filter(Boolean) as CodeBlock[]
    
    const allTags: Range<FunctionCallTag>[] = []
    for (const block of blocks) {
      const blockTags = tagFunctionCallsInBlock(block, options)
      allTags.push(...blockTags)
    }
    
    const effects: StateEffect<any>[] = [
      clearAllFunctionTagsEffect.of(null),
      ...(allTags.length > 0 ? [addFunctionTagsEffect.of(
        allTags.map(range => ({ position: range.from, tag: range.value }))
      )] : [])
    ]
    
    view.dispatch({ effects })
  } catch (error) {
    console.warn('Error refreshing function call tags:', error)
  }
}

export function getCurrentBlockTags(view: EditorView): FunctionCallTag[] {
  const block = getCurrentCodeBlock(view)
  if (!block) return []
  
  const tags = getFunctionTagsInRange(view.state, block.start, block.end)
  return tags.map(range => range.value)
}

export function createFunctionCallTaggingExtension(
  userOptions: FunctionCallTaggingOptions = {}
): Extension {
  const options = { ...DEFAULT_OPTIONS, ...userOptions }
  const debouncer = new Debouncer(options.debounceMs)
  
  const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
    if (update.docChanged || update.selectionSet) {
      debouncer.debounce(() => {
        refreshFunctionCallTags(update.view, options)
      })
    }
  })
  
  const viewPlugin = EditorView.domEventHandlers({
    focus: (_event, view) => {
      setTimeout(() => refreshFunctionCallTags(view, options), 0)
    }
  })
  
  return [functionTagField, updateListener, viewPlugin]
}

export function refreshFunctionCallTagsManual(view: EditorView, options?: FunctionCallTaggingOptions): void {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
  refreshFunctionCallTags(view, mergedOptions)
}

export function getAllDocumentTags(view: EditorView): FunctionCallTag[] {
  const tags = getAllFunctionTags(view.state)
  return tags.map(range => range.value)
}

export function debugFunctionCallTags(view: EditorView): void {
  console.group('Function Call Tags Debug')
  const allTags = getAllDocumentTags(view)
  const currentBlockTags = getCurrentBlockTags(view)
  const currentBlock = getCurrentCodeBlock(view)
  
  console.log('Current block:', currentBlock)
  console.log('All tags:', allTags)
  console.log('Current block tags:', currentBlockTags)
  console.groupEnd()
}