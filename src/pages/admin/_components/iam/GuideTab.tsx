import { Download } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion.tsx";
import { GUIDE_INTRO, GUIDE_SECTIONS } from "./guideContent.ts";
import { generateGuidePdf } from "./generateGuidePdf.ts";

/**
 * User guide for the enterprise IAM, RBAC & Organisation system. Explains,
 * in plain language, what the Roles/Permissions/Organisation/Assignments/
 * Approvals & SoD/Temp Access/Strategic Partners tabs do and how they fit
 * together with the rest of the app. Content lives in guideContent.ts so
 * this page and the downloadable PDF stay in sync.
 */
export default function GuideTab() {
  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pt-6">
          <div className="flex gap-3">
            <img
              src="https://hercules-cdn.com/file_q36P1nTMa0sJIOlIlJlgeK1z"
              alt="Geodata World Services Limited logo"
              className="h-10 w-10 shrink-0 rounded-lg object-contain"
            />
            <div>
              <h2 className="text-base font-semibold text-gray-900">Understanding this system</h2>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">{GUIDE_INTRO}</p>
              <p className="text-xs text-gray-500 mt-1">Geodata World Services Limited &middot; www.geodata.com.ng</p>
            </div>
          </div>
          <Button onClick={generateGuidePdf} className="gap-2 shrink-0 cursor-pointer">
            <Download size={15} /> Download PDF Guide
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Accordion type="multiple" defaultValue={["item-0"]} className="w-full">
            {GUIDE_SECTIONS.map((section, i) => (
              <AccordionItem key={section.title} value={`item-${i}`}>
                <AccordionTrigger className="text-left cursor-pointer">
                  <div>
                    <div className="font-semibold text-gray-900">{section.title}</div>
                    <div className="text-xs text-gray-500 font-normal mt-0.5">{section.summary}</div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pl-1">
                    {section.points.map((point, j) => (
                      <li key={j} className="flex gap-2 text-sm text-gray-700">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
