import { useEffect, useState } from 'react'
import { api } from '../api/endpoints'
import type { Applicant, FairnessReport, Loan, Offer, ScoreResult, StressResult, Wellness } from '../api/types'
import BandDistribution from '../charts/BandDistribution'
import CashFlowChart from '../charts/CashFlowChart'
import ContributionBar from '../charts/ContributionBar'
import IncomeScoreScatter from '../charts/IncomeScoreScatter'
import KfsCostBar from '../charts/KfsCostBar'
import RepaymentTimeline from '../charts/RepaymentTimeline'
import RiskGraph from '../charts/RiskGraph'
import SafeZoneMeter from '../charts/SafeZoneMeter'
import SavingsStreak from '../charts/SavingsStreak'
import SteadinessChart from '../charts/SteadinessChart'
import ScoreGauge from '../components/ScoreGauge'

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-card border border-line shadow-card p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </section>
  )
}

export default function ChartsGallery() {
  const [score, setScore] = useState<ScoreResult | null>(null)
  const [well, setWell] = useState<Wellness | null>(null)
  const [fair, setFair] = useState<FairnessReport | null>(null)
  const [apps, setApps] = useState<Applicant[]>([])
  const [offer, setOffer] = useState<Offer | null>(null)
  const [safe, setSafe] = useState({ safe: 0, cap: 0 })
  const [loan, setLoan] = useState<Loan | null>(null)
  const [shock, setShock] = useState(0.2)
  const [stress, setStress] = useState<StressResult | null>(null)

  useEffect(() => {
    api.getLatestScore().then(setScore).catch(() => undefined)
    api.getWellness(4).then(setWell).catch(() => undefined)
    api.getFairness().then(setFair).catch(() => undefined)
    api.getApplicants().then(setApps).catch(() => undefined)
    api.getOffers(1000000).then((o) => { setOffer(o.loans[0] ?? null); setSafe({ safe: o.safe_amount_paise, cap: o.rbi_cap_amount_paise ?? o.safe_amount_paise }) }).catch(() => undefined)
    api.getLoans().then((l) => setLoan(l[0] ?? null)).catch(() => undefined)
  }, [])
  useEffect(() => { api.stress(shock, 30678).then(setStress).catch(() => undefined) }, [shock])

  return (
    <div className="min-h-screen bg-bg p-4 md:p-8">
      <h1 className="text-2xl font-semibold mb-6">Charts gallery</h1>
      <div className="grid gap-6 lg:grid-cols-2 max-w-[1200px] mx-auto">
        {score && score.score !== null && <Box title="C1 Score gauge"><ScoreGauge score={score.score} band={score.band} /></Box>}
        {score && <Box title="C2 Contribution bar"><ContributionBar components={score.components} /></Box>}
        {score && <Box title="C3 Steadiness"><SteadinessChart weekly={score.metrics.weekly} medianPaise={score.metrics.median_weekly_income_paise} p25Paise={score.metrics.p25_weekly_income_paise} /></Box>}
        <Box title="C4 Risk graph"><RiskGraph result={stress} instalmentPaise={30678} shock={shock} onShockChange={setShock} /></Box>
        <Box title="C5 Safe zone"><SafeZoneMeter safePaise={safe.safe} capPaise={safe.cap} requestedPaise={1000000} /></Box>
        {offer && <Box title="C6 KFS cost"><KfsCostBar kfs={offer.kfs} /></Box>}
        {well && <Box title="C7 Cash flow"><CashFlowChart weeks={well.weeks} /></Box>}
        {score && <Box title="C8 Savings streak"><SavingsStreak weekly={score.metrics.weekly} /></Box>}
        {loan && <Box title="C9 Repayment timeline"><RepaymentTimeline rows={loan.schedule} /></Box>}
        {fair && <Box title="C10 Income vs score"><IncomeScoreScatter personas={fair.personas} /></Box>}
        <Box title="C12 Band distribution"><BandDistribution rows={apps} /></Box>
      </div>
    </div>
  )
}
