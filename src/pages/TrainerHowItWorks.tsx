import { PageTitle } from '../components/ui/kit'

const steps = [
  {
    title: 'Отправьте ссылку',
    body: 'На экране «Пригласить клиента» скопируйте постоянную ссылку или покажите QR-код.',
  },
  {
    title: 'Клиент регистрируется',
    body: 'По ссылке клиент создаёт аккаунт и заполняет анкету: цель, уровень, место и ограничения.',
  },
  {
    title: 'Соберите план',
    body: 'Откройте клиента и нажмите «Собрать из каталога» или соберите дни вручную.',
  },
  {
    title: 'Поправьте',
    body: 'Измените упражнения, подходы и дни так, как нужно именно этому человеку.',
  },
  {
    title: 'Сохраните',
    body: 'Нажмите «Сохранить». Клиент увидит план у себя.',
  },
] as const

export function TrainerHowItWorksPage() {
  return (
    <section className="mx-auto max-w-lg" aria-labelledby="how-title">
      <PageTitle>
        <span id="how-title">Как это работает</span>
      </PageTitle>
      <p className="mt-3 text-[17px] text-secondary-foreground">
        От приглашения до сохранённого плана — пять шагов.
      </p>
      <ol className="mt-6 grid gap-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[15px] font-semibold text-accent-ink">
              {index + 1}
            </span>
            <span>
              <span className="block text-[17px] font-semibold">{step.title}</span>
              <span className="mt-0.5 block text-[15px] text-secondary-foreground">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <p className="text-[17px] font-semibold">Где создаются упражнения</p>
        <p className="mt-1 text-[15px] text-secondary-foreground">
          Упражнения вы создаёте здесь, в этом приложении, в разделе «Упражнения». Отдельная админка
          платформы нужна только владельцу платформы и поддержке. Тренерам и клиентам она не нужна.
        </p>
      </div>
    </section>
  )
}
