import { useI18n } from '../../contexts/I18nContext'
import { FlowArrow } from '../ui/FlowArrow'

interface EmptyBoardGuideProps {
  onCreateTask: () => void
}

export function EmptyBoardGuide({ onCreateTask }: EmptyBoardGuideProps) {
  const { t } = useI18n()

  const steps = [
    { num: '1', title: t('onboarding.step1.title'), desc: t('onboarding.step1.desc') },
    { num: '2', title: t('onboarding.step2.title'), desc: t('onboarding.step2.desc') },
    { num: '3', title: t('onboarding.step3.title'), desc: t('onboarding.step3.desc') },
    { num: '4', title: t('onboarding.step4.title'), desc: t('onboarding.step4.desc') },
  ]

  return (
    <div className="onboarding-guide">
      <div>
        <h2 className="onboarding-title">{t('onboarding.title')}</h2>
        <p className="onboarding-subtitle">{t('onboarding.subtitle')}</p>
      </div>

      <div className="onboarding-flow">
        {steps.map((step, i) => (
          <span key={step.num} style={{ display: 'contents' }}>
            <div className="onboarding-step">
              <div className="onboarding-step-number">{step.num}</div>
              <div className="onboarding-step-title">{step.title}</div>
              <div className="onboarding-step-desc">{step.desc}</div>
            </div>
            {i < steps.length - 1 && (
              <FlowArrow />
            )}
          </span>
        ))}
      </div>

      <button className="btn btn-primary btn-lg" onClick={onCreateTask}>
        {t('onboarding.cta')}
      </button>
    </div>
  )
}
