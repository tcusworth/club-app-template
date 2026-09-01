import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function RoiCalculator() {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="p-0 h-auto"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ROI Calculator</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quantify the business value of OPA investments
          </p>
        </div>
      </div>

      {/* Placeholder Content */}
      <Card className="border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The ROI Calculator will help you model the financial impact of Open Process Automation investments, including:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>Capital expenditure and operational cost analysis</li>
            <li>Productivity and efficiency gains modeling</li>
            <li>Multi-year financial projections</li>
            <li>Scenario comparison and sensitivity analysis</li>
            <li>Executive summary report generation</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/30">
            This feature is under development. Check back soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
