const coverGradients = [
  "linear-gradient(135deg, #2563eb 0%, #22d3ee 100%)",
  "linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%)",
  "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)",
  "linear-gradient(135deg, #10b981 0%, #22c55e 100%)",
  "linear-gradient(135deg, #f97316 0%, #fb7185 100%)",
  "linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%)",
]

export const getBoardCoverGradient = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash)
  }
  const normalized = Math.abs(hash)
  return coverGradients[normalized % coverGradients.length]
}
