import RentVsBuyClient from "./RentVsBuyClient";

/**
 * Rent vs Buy section for the MREIF mortgage page.
 *
 * Wraps the interactive calculator with the reframe headline and intro,
 * styled to match the other mortgage page sections.
 */
export default function MortgageRentVsBuy() {
  return (
    <section className="bg-bone dark:bg-navy-950 py-32 md:py-48">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-12 mb-20">
          <div className="col-span-12 lg:col-span-5">
            <p className="eyebrow mb-6">The honest comparison</p>
            <h2 className="text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
              What does renting actually cost you?
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8 lg:pt-6">
            <p className="text-lg leading-relaxed text-ink dark:text-bone/75">
              Abuja rent is paid a year upfront and rises every renewal. An MREIF
              mortgage is a flat monthly payment, fixed for 20 years, on a home
              you own. Most people have never seen the two side by side. Adjust
              the numbers below to match your situation.
            </p>
          </div>
        </div>

        <RentVsBuyClient />
      </div>
    </section>
  );
}
