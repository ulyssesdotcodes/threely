/**
 * Tests for the Function Call Tagging Extension
 * 
 * These tests verify that the CodeMirror extension correctly identifies and tags
 * function calls with stable UUIDs using Range Sets.
 */

import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { basicSetup } from 'codemirror'

import { 
  createFunctionCallTaggingExtension,
  getCurrentBlockTags,
  getAllDocumentTags,
  refreshFunctionCallTagsManual,
  debugFunctionCallTags
} from '../src/codemirror/function-call-extension'

import { 
  functionTagField,
  getFunctionTagsInRange,
  getAllFunctionTags
} from '../src/codemirror/function-call-state'

import { FunctionCallTag } from '../src/codemirror/function-call-tag'

// Mock DOM for testing
const mockContainer = {
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  style: {}
} as any

// Helper to create a test editor
function createTestEditor(content: string = '', options = {}) {
  const state = EditorState.create({
    doc: content,
    extensions: [
      basicSetup,
      createFunctionCallTaggingExtension({
        debug: true,
        debounceMs: 0, // No debouncing in tests
        ...options
      })
    ]
  })

  const view = new EditorView({
    state,
    parent: mockContainer
  })

  return { state, view }
}

describe('Function Call Tagging Extension', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Extension Creation', () => {
    it('should create extension without errors', () => {
      expect(() => {
        createFunctionCallTaggingExtension()
      }).not.toThrow()
    })

    it('should create extension with custom options', () => {
      const extension = createFunctionCallTaggingExtension({
        debug: true,
        debounceMs: 500,
        maxBlockSize: 5000,
        tagAllBlocks: true
      })

      expect(extension).toBeDefined()
      expect(Array.isArray(extension)).toBe(true)
    })

    it('should create editor with function call tagging extension', () => {
      expect(() => {
        createTestEditor('frame()')
      }).not.toThrow()
    })
  })

  describe('Function Call Detection', () => {
    it('should detect simple function calls', async () => {
      const { view } = createTestEditor('frame()')

      // Allow some time for async processing
      await new Promise(resolve => setTimeout(resolve, 50))

      // Manual refresh to ensure tags are created
      refreshFunctionCallTagsManual(view, { debug: true })

      const tags = getAllDocumentTags(view)
      expect(tags.length).toBeGreaterThan(0)

      const frameTag = tags.find(tag => tag.functionName === 'frame')
      expect(frameTag).toBeDefined()
      expect(frameTag?.uuid).toMatch(/^fn-frame-/)
    })

    it('should detect nested function calls', async () => {
      const { view } = createTestEditor('mesh(sphere(), material())')

      await new Promise(resolve => setTimeout(resolve, 50))
      refreshFunctionCallTagsManual(view, { debug: true })

      const tags = getAllDocumentTags(view)
      expect(tags.length).toBeGreaterThanOrEqual(3) // mesh, sphere, material

      const functionNames = tags.map(tag => tag.functionName)
      expect(functionNames).toContain('mesh')
      expect(functionNames).toContain('sphere')
      expect(functionNames).toContain('material')
    })

    it('should detect method chaining', async () => {
      const { view } = createTestEditor('mesh(sphere()).translateX(1).render("test")')

      await new Promise(resolve => setTimeout(resolve, 50))
      refreshFunctionCallTagsManual(view, { debug: true })

      const tags = getAllDocumentTags(view)
      const functionNames = tags.map(tag => tag.functionName)

      expect(functionNames).toContain('mesh')
      expect(functionNames).toContain('sphere')
      expect(functionNames).toContain('translateX')
      expect(functionNames).toContain('render')
    })
  })

  describe('UUID Stability', () => {
    it('should generate consistent UUIDs for same function calls', async () => {
      const code = 'frame()'
      const { view: view1 } = createTestEditor(code)
      const { view: view2 } = createTestEditor(code)

      await new Promise(resolve => setTimeout(resolve, 50))
      
      refreshFunctionCallTagsManual(view1, { debug: true })
      refreshFunctionCallTagsManual(view2, { debug: true })

      const tags1 = getAllDocumentTags(view1)
      const tags2 = getAllDocumentTags(view2)

      expect(tags1.length).toBe(1)
      expect(tags2.length).toBe(1)

      const frameTag1 = tags1.find(tag => tag.functionName === 'frame')
      const frameTag2 = tags2.find(tag => tag.functionName === 'frame')

      expect(frameTag1?.uuid).toBe(frameTag2?.uuid)
    })

    it('should generate different UUIDs for different positions', async () => {
      const { view } = createTestEditor('frame()\n\nframe()')

      await new Promise(resolve => setTimeout(resolve, 50))
      refreshFunctionCallTagsManual(view, { debug: true, tagAllBlocks: true })

      const tags = getAllDocumentTags(view)
      const frameTags = tags.filter(tag => tag.functionName === 'frame')

      expect(frameTags.length).toBe(2)
      expect(frameTags[0].uuid).not.toBe(frameTags[1].uuid)
    })
  })

  describe('Current Block Detection', () => {
    it('should get tags for current block only', async () => {
      const { view } = createTestEditor('frame()\n\nsphere()')

      // Position cursor in first block
      view.dispatch({
        selection: { anchor: 3, head: 3 } // Inside 'frame()'
      })

      await new Promise(resolve => setTimeout(resolve, 50))
      refreshFunctionCallTagsManual(view)

      const currentBlockTags = getCurrentBlockTags(view)
      expect(currentBlockTags.length).toBe(1)
      expect(currentBlockTags[0].functionName).toBe('frame')
    })
  })

  describe('Document Changes', () => {
    it('should update tags when content changes', async () => {
      const { view } = createTestEditor('frame()')

      await new Promise(resolve => setTimeout(resolve, 50))
      refreshFunctionCallTagsManual(view)

      let tags = getAllDocumentTags(view)
      expect(tags.length).toBe(1)
      expect(tags[0].functionName).toBe('frame')

      // Change content
      view.dispatch({
        changes: { from: 0, to: 7, insert: 'sphere()' }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      tags = getAllDocumentTags(view)
      expect(tags.length).toBe(1)
      expect(tags[0].functionName).toBe('sphere')
    })

    it('should handle complex DSL expressions', async () => {
      const complexCode = `
mesh(
  sphere(1),
  material({ color: 0xff0000 })
).translateX(mult(frame(), 0.1)).render("test")
      `.trim()

      const { view } = createTestEditor(complexCode)

      await new Promise(resolve => setTimeout(resolve, 50))
      refreshFunctionCallTagsManual(view, { debug: true })

      const tags = getAllDocumentTags(view)
      const functionNames = tags.map(tag => tag.functionName)

      expect(functionNames).toContain('mesh')
      expect(functionNames).toContain('sphere')
      expect(functionNames).toContain('material')
      expect(functionNames).toContain('translateX')
      expect(functionNames).toContain('mult')
      expect(functionNames).toContain('frame')
      expect(functionNames).toContain('render')
    })
  })

  describe('Debug Utilities', () => {
    it('should provide debug information', () => {
      const { view } = createTestEditor('frame()')

      // Should not throw when calling debug function
      expect(() => {
        debugFunctionCallTags(view)
      }).not.toThrow()
    })

    it('should provide range-based tag queries', () => {
      const { view } = createTestEditor('frame() sphere()')

      refreshFunctionCallTagsManual(view)

      // Get tags in specific range
      const tagsInRange = getFunctionTagsInRange(view.state, 0, 7) // Just 'frame()'
      expect(tagsInRange.length).toBe(1)
      expect(tagsInRange[0].value.functionName).toBe('frame')
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle empty content gracefully', () => {
      const { view } = createTestEditor('')

      expect(() => {
        refreshFunctionCallTagsManual(view)
        const tags = getAllDocumentTags(view)
        expect(tags.length).toBe(0)
      }).not.toThrow()
    })

    it('should handle malformed code gracefully', () => {
      const { view } = createTestEditor('frame( incomplete code')

      expect(() => {
        refreshFunctionCallTagsManual(view)
        getAllDocumentTags(view)
      }).not.toThrow()
    })

    it('should respect maxBlockSize option', () => {
      const largeCode = 'frame()'.repeat(1000) // Very large block
      const { view } = createTestEditor(largeCode)

      expect(() => {
        refreshFunctionCallTagsManual(view, { maxBlockSize: 100 })
        const tags = getAllDocumentTags(view)
        // Should be empty due to size limit
        expect(tags.length).toBe(0)
      }).not.toThrow()
    })
  })

  describe('State Field Integration', () => {
    it('should properly integrate with state field', () => {
      const { view } = createTestEditor('frame()')

      // Check that function tag field exists in state
      const fieldValue = view.state.field(functionTagField, false)
      expect(fieldValue).toBeDefined()
    })

    it('should maintain tags through state updates', async () => {
      const { view } = createTestEditor('frame()')

      refreshFunctionCallTagsManual(view)
      await new Promise(resolve => setTimeout(resolve, 50))

      // Get tags through state field
      const allTags = getAllFunctionTags(view.state)
      expect(allTags.length).toBeGreaterThan(0)

      // Verify tag structure
      const firstTag = allTags[0]
      expect(firstTag.value).toBeInstanceOf(FunctionCallTag)
      expect(firstTag.value.functionName).toBeDefined()
      expect(firstTag.value.uuid).toBeDefined()
    })
  })
})