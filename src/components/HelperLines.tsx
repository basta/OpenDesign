import { useStore } from '@xyflow/react'

type Props = {
  horizontal?: number
  vertical?: number
}

export function HelperLines({ horizontal, vertical }: Props) {
  const transform = useStore(s => s.transform)
  const [tx, ty, zoom] = transform

  if (horizontal === undefined && vertical === undefined) return null

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {vertical !== undefined && (
        <line
          x1={vertical * zoom + tx}
          x2={vertical * zoom + tx}
          y1={0}
          y2="100%"
          stroke="#0041d0"
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
      )}
      {horizontal !== undefined && (
        <line
          y1={horizontal * zoom + ty}
          y2={horizontal * zoom + ty}
          x1={0}
          x2="100%"
          stroke="#0041d0"
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
      )}
    </svg>
  )
}
