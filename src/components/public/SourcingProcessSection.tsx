import { Package, FileText, Factory, Truck } from "lucide-react";
import { SOURCING_PROCESS } from "@/lib/siteContent";

const STEP_ICONS = [Package, FileText, Factory, Truck];

export default function SourcingProcessSection() {
  return (
    <section className="section-compact">
      <div className="container">
        <h2 className="section-title section-title--center">
          {SOURCING_PROCESS.title}
        </h2>
        <ol className="process-timeline">
          {SOURCING_PROCESS.steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? Package;
            return (
              <li key={step.step} className="process-step">
                <div className="process-step-icon" aria-hidden>
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <div className="process-step-body">
                  <span className="process-step-number">
                    Bước {step.step}
                  </span>
                  <h3 className="process-step-title">{step.title}</h3>
                  <p className="process-step-desc">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
