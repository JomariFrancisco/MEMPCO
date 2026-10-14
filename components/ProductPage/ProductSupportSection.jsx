import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export default function ProductSupportSection({
  id,
  kicker,
  title,
  description,
  supportTitle,
  supportText,
}) {
  return (
    <section className="mem-product-help" aria-labelledby={`${id}-heading`}>
      <div className="mem-product-help__inner">
        <div className="mem-product-help__copy">
          <p className="mem-product-help__kicker">{kicker}</p>
          <h2 className="mem-product-help__title" id={`${id}-heading`}>
            {title}
          </h2>
          <p className="mem-product-help__description">{description}</p>
        </div>

        <aside className="mem-product-help__panel" aria-label="MEMPCO support">
          <p className="mem-product-help__panel-kicker">MEMPCO support</p>
          <h3 className="mem-product-help__panel-title">{supportTitle}</h3>
          <p className="mem-product-help__panel-text">{supportText}</p>
          <div className="mem-product-help__links">
            <Link href="/branches" className="mem-product-help__link">
              Find a branch <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/contact-details" className="mem-product-help__link">
              Contact MEMPCO <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  )
}
