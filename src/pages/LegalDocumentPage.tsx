import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { BrandLogo } from '../components/brand/BrandLogo'
import { LegalDocumentLinks } from '../components/legal/LegalDocumentLinks'
import { ThemeToggle } from '../components/layout/ThemeToggle'
import { APP_PATHS } from '../config'
import { PRIVACY_POLICY, USER_AGREEMENT, type LegalBlock, type LegalDocument } from '../content/legal-documents'

function LegalBlockView({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case 'paragraph':
      return <p className="text-[15px] leading-relaxed">{block.text}</p>
    case 'list':
      return (
        <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    default: {
      const unexpected: never = block
      return unexpected
    }
  }
}

function LegalDocumentView({ document }: { document: LegalDocument }): ReactNode {
  return (
    <main className="min-h-dvh bg-background px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mx-auto mb-6 flex w-full max-w-2xl items-center justify-between gap-3">
        <BrandLogo className="h-10" />
        <ThemeToggle />
      </div>
      <article className="mx-auto grid w-full max-w-2xl gap-6">
        <p>
          <Link
            to={APP_PATHS.login}
            className="rounded-sm text-sm text-accent-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Ко входу
          </Link>
        </p>
        <header className="grid gap-3">
          <h1 className="text-[28px] font-bold leading-tight">{document.title}</h1>
          <p className="text-[15px] leading-relaxed text-secondary-foreground">{document.kicker}</p>
        </header>
        {document.sections.map((section) => (
          <section key={section.heading} className="grid gap-2">
            <h2 className="text-[17px] font-semibold">{section.heading}</h2>
            {section.blocks.map((block, index) => (
              <LegalBlockView key={`${section.heading}-${block.type}-${index}`} block={block} />
            ))}
          </section>
        ))}
        <LegalDocumentLinks />
      </article>
    </main>
  )
}

export function PrivacyPolicyPage() {
  return <LegalDocumentView document={PRIVACY_POLICY} />
}

export function UserAgreementPage() {
  return <LegalDocumentView document={USER_AGREEMENT} />
}
