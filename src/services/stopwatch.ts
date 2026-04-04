export interface LapSplit {
  lapNumber: number
  cumulativeMs: number
  splitMs: number
}

export function computeLapSplits(cumulativeLaps: number[]): LapSplit[] {
  const total = cumulativeLaps.length
  return cumulativeLaps.map((cumMs, index) => {
    const lapNumber = total - index
    const nextCumMs = index + 1 < total ? cumulativeLaps[index + 1] : 0
    return {
      lapNumber,
      cumulativeMs: cumMs,
      splitMs: cumMs - nextCumMs,
    }
  })
}

export function formatStopwatch(milliseconds: number) {
  const totalCentiseconds = Math.floor(milliseconds / 10)
  const minutes = Math.floor(totalCentiseconds / 6000)
  const seconds = Math.floor((totalCentiseconds % 6000) / 100)
  const centiseconds = totalCentiseconds % 100

  return `${pad2(minutes)}:${pad2(seconds)}.${pad2(centiseconds)}`
}

function pad2(value: number) {
  return value.toString().padStart(2, '0')
}
