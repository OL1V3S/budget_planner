import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { importPreviewApi } from '../api/importPreviewApi'
import { useImportPreview } from './useImportPreview'

vi.mock('../api/importPreviewApi', () => ({ importPreviewApi: {
  getOpen: vi.fn(), getById: vi.fn(), uploadSunflower: vi.fn(), updateRow: vi.fn(),
} }))

const preview = {
  batchId: '11111111-1111-1111-1111-111111111111',
  expiresAt: '2026-08-21T12:00:00Z',
  rows: [{ rowId: 'row-1', selectedForImport: false }],
}

describe('useImportPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/transactions')
    importPreviewApi.getOpen.mockResolvedValue({ status: 204, data: null })
  })

  it('resumes a deep-linked batch through the server and remembers the validated id', async () => {
    window.history.replaceState({}, '', '/transactions?importBatch=11111111-1111-1111-1111-111111111111')
    importPreviewApi.getById.mockResolvedValue({ status: 200, data: preview })

    const { result } = renderHook(() => useImportPreview())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(importPreviewApi.getById).toHaveBeenCalledWith(preview.batchId, expect.any(AbortSignal))
    expect(result.current.preview).toEqual(preview)
    expect(window.location.search).toContain(`importBatch=${preview.batchId}`)
  })

  it('maps safe upload errors and does not expose server internals', async () => {
    importPreviewApi.uploadSunflower.mockRejectedValue({
      response: { data: { code: 'encrypted_pdf', message: 'internal detail' } },
    })
    const { result } = renderHook(() => useImportPreview())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.upload(new File(['pdf'], 'statement.pdf')))

    expect(result.current.error).toBe('Encrypted or password-protected PDFs are not supported.')
    expect(result.current.error).not.toContain('internal detail')
  })

  it('persists a row update into the current preview', async () => {
    importPreviewApi.getOpen.mockResolvedValue({ status: 200, data: preview })
    importPreviewApi.updateRow.mockResolvedValue({ data: { ...preview.rows[0], selectedForImport: true } })
    const { result } = renderHook(() => useImportPreview())
    await waitFor(() => expect(result.current.preview).toEqual(preview))

    await act(() => result.current.updateRow('row-1', { selectedForImport: true }))

    expect(result.current.preview.rows[0].selectedForImport).toBe(true)
  })

  it('keeps the preview unchanged when the server rejects a row mutation', async () => {
    importPreviewApi.getOpen.mockResolvedValue({ status: 200, data: preview })
    importPreviewApi.updateRow.mockRejectedValue({
      response: { data: { code: 'row_not_selectable', message: 'internal detail' } },
    })
    const { result } = renderHook(() => useImportPreview())
    await waitFor(() => expect(result.current.preview).toEqual(preview))

    await act(() => result.current.updateRow('row-1', { selectedForImport: true }))

    expect(result.current.preview).toEqual(preview)
    expect(result.current.error).toBe('That row cannot be selected for import.')
    expect(result.current.error).not.toContain('internal detail')
  })
})
