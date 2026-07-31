'use client'
'use no memo'

import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { Chart } from '@tanstack/react-charts'
import { arc } from 'd3-shape'

interface AlphabetRow {
  letter: string
  frequency: number
}

const alphabet: readonly AlphabetRow[] = [
  { letter: 'E', frequency: 0.12702 },
  { letter: 'T', frequency: 0.09056 },
  { letter: 'A', frequency: 0.08167 },
  { letter: 'O', frequency: 0.07507 },
  { letter: 'I', frequency: 0.06966 },
]

// const percent = new Intl.NumberFormat('en-US', {
//   style: 'percent',
//   maximumFractionDigits: 1,
// })

const innerRadiusRatio = 0.2
const barRatio = 0.62
const colors = ['#7c3aed', '#0ea5e9', '#14b8a6', '#f59e0b']
const maximumFrequency = alphabet[0]?.frequency ?? 1

const definition = () => {
  const data = radialBarLayout(selectRadialBarData(alphabet))

  return defineChart({
    marks: [
      polar({
        radiusRatio: 0.84,
        marks: [
          radialArc(data, {
            className: 'ts-chart__radial-bars',
            generator: ({ radius }) => {
              const innerRadius = radius * innerRadiusRatio
              const band = (radius - innerRadius) / data.length
              const barSize = band * barRatio
              const offset = Math.round((band - barSize) / 2)

              return arc<unknown, RadialBarLayoutDatum>()
                .startAngle(0)
                .endAngle(
                  (row) => (row.frequency / maximumFrequency) * Math.PI * 2,
                )
                .innerRadius((row) => innerRadius + row.ring * band + offset)
                .outerRadius(
                  (row) => innerRadius + row.ring * band + offset + barSize,
                )
                .cornerRadius(barSize / 2)
            },
            color: 'letter',
          }),
        ],
      }),
    ],
    color: { range: colors },
    margin: 0,
  })
}

export function LetterFrequencyChart() {
  return (
    <Chart
      definition={definition()}
      ariaLabel='English letter frequencies'
      aspectRatio={1 / 1}
      initialWidth={440}
    />
  )
}

const sliceSize = 4

function selectRadialBarData(rows: readonly AlphabetRow[], revision = 0) {
  const start = Math.abs(revision % 2) * sliceSize
  return rows.slice(start, start + sliceSize)
}

interface RadialBarLayoutDatum extends AlphabetRow {
  ring: number
}

function radialBarLayout(
  rows: readonly AlphabetRow[],
): readonly RadialBarLayoutDatum[] {
  return rows.map((row, ring) => ({ ...row, ring }))
}
