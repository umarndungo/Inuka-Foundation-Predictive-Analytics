import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DemandForecastChart } from "@/components/dashboard/DemandForecastChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockDemandForecast, mockRegionalForecasts } from "@/lib/mock/data";
import { TrendingUp, TrendingDown, Target, Calendar, BarChart3, MapPin, Users, AlertTriangle, CheckCircle } from "lucide-react";

export default function ForecastsPage() {
  const regions = Object.keys(mockRegionalForecasts);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-h1 font-semibold tracking-tight">Demand Forecasts</h1>
            <p className="text-body-lg text-muted-foreground mt-2">
              Regional demand predictions — Plan resource allocation and intervention scheduling.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Target className="w-3.5 h-3.5" />
              {mockDemandForecast.summary.confidence}% confidence
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Calendar className="w-3.5 h-3.5" />
              7-day forecast
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DemandForecastChart data={mockDemandForecast} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-h3">National Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-5 rounded-lg bg-muted/50 text-center">
                  <p className="text-caption text-muted-foreground">Expected Change</p>
                  <p className="text-h2 font-semibold text-primary mt-1">{mockDemandForecast.summary.expectedChange >= 0 ? "+" : ""}{mockDemandForecast.summary.expectedChange.toFixed(1)}%</p>
                  <p className="text-caption text-muted-foreground mt-1">vs historical</p>
                </div>
                <div className="p-5 rounded-lg bg-muted/50 text-center">
                  <p className="text-caption text-muted-foreground">Confidence</p>
                  <p className="text-h2 font-semibold mt-1">{mockDemandForecast.summary.confidence}%</p>
                  <p className="text-caption text-muted-foreground mt-1">model confidence</p>
                </div>
                <div className="p-5 rounded-lg bg-muted/50 text-center">
                  <p className="text-caption text-muted-foreground">Peak Day</p>
                  <p className="text-h3 font-semibold mt-1">{new Date(mockDemandForecast.summary.peakDay).toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })}</p>
                  <p className="text-caption text-muted-foreground mt-1">highest demand</p>
                </div>
              </div>

              <div className="p-5 rounded-lg bg-muted/50">
                <p className="text-small text-muted-foreground leading-relaxed">
                  <strong>Forecast Summary:</strong> Demand is expected to increase by <strong>{mockDemandForecast.summary.expectedChange.toFixed(1)}%</strong> over the next 7 days,
                  with the highest concentration projected for <strong>{new Date(mockDemandForecast.summary.peakDay).toLocaleDateString("en-KE", { weekday: "long", month: "long", day: "numeric" })}</strong>.
                  Model confidence: <strong>{mockDemandForecast.summary.confidence}%</strong>.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-small">Key Insights</h4>
                <ul className="space-y-2 text-small text-muted-foreground">
                  <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-success" /> Nairobi shows strongest growth trajectory (+22.5%)</li>
                  <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-success" /> Eldoret emerging as high-growth region (+23.5%)</li>
                  <li className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Kisumu demand driven by seasonal factors</li>
                  <li className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> Confidence decreases beyond 7-day horizon</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" /> All regions show positive trend</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="national" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
            <TabsTrigger value="national">National</TabsTrigger>
            {regions.map((region) => (
              <TabsTrigger key={region} value={region}>{region}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="national">
            <DemandForecastChart data={mockDemandForecast} />
          </TabsContent>

          {regions.map((region) => (
            <TabsContent key={region} value={region}>
              <DemandForecastChart data={mockRegionalForecasts[region]} />
            </TabsContent>
          ))}
        </Tabs>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-h3">Regional Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-small text-muted-foreground">
                    <th className="pb-3 font-medium">Region</th>
                    <th className="pb-3 font-medium text-right">Historical Avg</th>
                    <th className="pb-3 font-medium text-right">Predicted Avg</th>
                    <th className="pb-3 font-medium text-right">Change</th>
                    <th className="pb-3 font-medium text-right">Confidence</th>
                    <th className="pb-3 font-medium text-right">Peak Day</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {["National", ...regions].map((region) => {
                    const data = region === "National" ? mockDemandForecast : mockRegionalForecasts[region];
                    const histAvg = data.historical.reduce((a, b) => a + b, 0) / data.historical.length;
                    const predAvg = data.predicted.reduce((a, b) => a + b, 0) / data.predicted.length;
                    const change = ((predAvg - histAvg) / histAvg) * 100;
                    return (
                      <tr key={region}>
                        <td className="py-4 font-medium text-small">{region}</td>
                        <td className="py-4 text-right text-small">{Math.round(histAvg).toLocaleString()}</td>
                        <td className="py-4 text-right font-medium text-primary text-small">{Math.round(predAvg).toLocaleString()}</td>
                        <td className={cn("py-4 text-right font-medium text-small", change >= 0 ? "text-success" : "text-destructive")}>
                          {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                        </td>
                        <td className="py-4 text-right text-small">{data.summary.confidence}%</td>
                        <td className="py-4 text-right text-small">{new Date(data.summary.peakDay).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}