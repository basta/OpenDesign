import type { Node, NodePositionChange, XYPosition } from '@xyflow/react'

export const SNAP_PX = 6

export type HelperLinesResult = {
  horizontal?: number
  vertical?: number
  snapPosition: Partial<XYPosition>
}

type Bounds = {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
  centerX: number
  centerY: number
}

function bounds(x: number, y: number, w: number, h: number): Bounds {
  return {
    left: x,
    right: x + w,
    top: y,
    bottom: y + h,
    width: w,
    height: h,
    centerX: x + w / 2,
    centerY: y + h / 2,
  }
}

export function getHelperLines(
  change: NodePositionChange,
  nodes: Node[],
  distance = 5,
): HelperLinesResult {
  const result: HelperLinesResult = {
    horizontal: undefined,
    vertical: undefined,
    snapPosition: { x: undefined, y: undefined },
  }

  const dragged = nodes.find(n => n.id === change.id)
  if (!dragged || !change.position) return result
  const dw = dragged.measured?.width
  const dh = dragged.measured?.height
  if (!dw || !dh) return result

  const a = bounds(change.position.x, change.position.y, dw, dh)

  let xDist = distance
  let yDist = distance

  for (const other of nodes) {
    if (other.id === dragged.id) continue
    const ow = other.measured?.width
    const oh = other.measured?.height
    if (!ow || !oh) continue
    const b = bounds(other.position.x, other.position.y, ow, oh)

    const dLL = Math.abs(a.left - b.left)
    if (dLL < xDist) {
      result.snapPosition.x = b.left
      result.vertical = b.left
      xDist = dLL
    }
    const dRR = Math.abs(a.right - b.right)
    if (dRR < xDist) {
      result.snapPosition.x = b.right - a.width
      result.vertical = b.right
      xDist = dRR
    }
    const dLR = Math.abs(a.left - b.right)
    if (dLR < xDist) {
      result.snapPosition.x = b.right
      result.vertical = b.right
      xDist = dLR
    }
    const dRL = Math.abs(a.right - b.left)
    if (dRL < xDist) {
      result.snapPosition.x = b.left - a.width
      result.vertical = b.left
      xDist = dRL
    }
    const dCX = Math.abs(a.centerX - b.centerX)
    if (dCX < xDist) {
      result.snapPosition.x = b.centerX - a.width / 2
      result.vertical = b.centerX
      xDist = dCX
    }

    const dTT = Math.abs(a.top - b.top)
    if (dTT < yDist) {
      result.snapPosition.y = b.top
      result.horizontal = b.top
      yDist = dTT
    }
    const dBB = Math.abs(a.bottom - b.bottom)
    if (dBB < yDist) {
      result.snapPosition.y = b.bottom - a.height
      result.horizontal = b.bottom
      yDist = dBB
    }
    const dBT = Math.abs(a.bottom - b.top)
    if (dBT < yDist) {
      result.snapPosition.y = b.top - a.height
      result.horizontal = b.top
      yDist = dBT
    }
    const dTB = Math.abs(a.top - b.bottom)
    if (dTB < yDist) {
      result.snapPosition.y = b.bottom
      result.horizontal = b.bottom
      yDist = dTB
    }
    const dCY = Math.abs(a.centerY - b.centerY)
    if (dCY < yDist) {
      result.snapPosition.y = b.centerY - a.height / 2
      result.horizontal = b.centerY
      yDist = dCY
    }
  }

  return result
}
