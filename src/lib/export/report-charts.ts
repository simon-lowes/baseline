/**
 * Report Chart Utilities
 *
 * Captures chart components as images for PDF reports using html2canvas
 */

import html2canvas from 'html2canvas'
import type { ChartImage } from '@/types/export'

interface CaptureOptions {
  scale?: number
  backgroundColor?: string
  width?: number
  height?: number
}

/**
 * Capture an HTML element as a base64 image
 */
export async function captureElementAsImage(
  element: HTMLElement,
  options: CaptureOptions = {}
): Promise<string> {
  const { scale = 2, backgroundColor = '#ffffff' } = options

  const canvas = await html2canvas(element, {
    backgroundColor,
    scale,
    logging: false,
    useCORS: true,
    allowTaint: true,
  })

  return canvas.toDataURL('image/png')
}

/**
 * Capture a chart component using a ref
 */
export async function captureChartAsImage(
  chartRef: React.RefObject<HTMLDivElement>,
  options: CaptureOptions = {}
): Promise<ChartImage | null> {
  if (!chartRef.current) return null

  const dataUrl = await captureElementAsImage(chartRef.current, options)

  return {
    type: 'trend',
    dataUrl,
    width: chartRef.current.offsetWidth,
    height: chartRef.current.offsetHeight,
  }
}

/**
 * Create a temporary container for rendering charts off-screen
 */
export function createOffscreenContainer(): HTMLDivElement {
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '800px'
  container.style.backgroundColor = '#ffffff'
  document.body.appendChild(container)
  return container
}

/**
 * Remove off-screen container
 */
export function removeOffscreenContainer(container: HTMLDivElement): void {
  if (container.parentNode) {
    container.parentNode.removeChild(container)
  }
}

/**
 * Wait for chart animations to complete
 */
export function waitForChartRender(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Capture multiple chart refs in sequence
 */
export async function captureAllCharts(
  chartRefs: Record<string, React.RefObject<HTMLDivElement>>,
  options: CaptureOptions = {}
): Promise<Record<string, ChartImage | null>> {
  const results: Record<string, ChartImage | null> = {}

  for (const [key, ref] of Object.entries(chartRefs)) {
    if (ref.current) {
      const image = await captureChartAsImage(ref, options)
      if (image) {
        image.type = key as ChartImage['type']
      }
      results[key] = image
    } else {
      results[key] = null
    }
  }

  return results
}

/**
 * Convert a canvas to a Blob
 */
export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to convert canvas to blob'))
      }
    }, type)
  })
}
