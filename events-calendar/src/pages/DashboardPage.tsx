import { useQuery } from "convex/react";
import {
  Activity,
  ArrowUpRight,
  Clock,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui";
import { api } from "../../convex/_generated/api";

const stats = [
  {
    title: "Stat One",
    value: "123",
    change: "+12%",
    icon: Activity,
    color: "text-chart-1",
    bg: "bg-chart-1/10",
  },
  {
    title: "Stat Two",
    value: "456",
    change: "+8%",
    icon: TrendingUp,
    color: "text-chart-2",
    bg: "bg-chart-2/10",
  },
  {
    title: "Stat Three",
    value: "78.9",
    change: "+24%",
    icon: Clock,
    color: "text-chart-3",
    bg: "bg-chart-3/10",
  },
];

const quickActions = [
  { label: "Account Settings", href: "/settings", icon: Settings },
];

export function DashboardPage() {
  const user = useQuery(api.auth.currentUser);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          Dashboard subtitle goes here
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(stat => (
          <Card
            key={stat.title}
            className="rounded-xl border bg-card text-card-foreground shadow-sm p-6"
          >
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </p>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`size-4 ${stat.color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight">
              {stat.value}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm font-medium text-success">
                {stat.change}
              </span>
              <ArrowUpRight className="size-3 text-success" />
              <span className="text-xs text-muted-foreground">
                from last week
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <CardHeader className="space-y-1.5 p-6 pb-4">
            <CardTitle className="font-semibold leading-none tracking-tight flex items-center gap-2">
              <Settings className="size-5 text-muted-foreground" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Card description goes here
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 grid gap-3">
            {quickActions.map(action => (
              <Link
                key={action.label}
                to={action.href}
                className="group flex items-center justify-between rounded-md border px-4 py-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2 transition-colors group-hover:bg-primary/10">
                    <action.icon className="size-4 transition-colors group-hover:text-primary" />
                  </div>
                  <span>{action.label}</span>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <CardHeader className="space-y-1.5 p-6 pb-4">
            <CardTitle className="font-semibold leading-none tracking-tight flex items-center gap-2">
              <Sparkles className="size-5 text-chart-3" />
              Getting Started
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Card description goes here
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <ul className="space-y-4">
              {[
                {
                  title: "First step title",
                  desc: "Description of what to do",
                  color: "bg-chart-1",
                },
                {
                  title: "Second step title",
                  desc: "Description of what to do",
                  color: "bg-chart-2",
                },
                {
                  title: "Third step title",
                  desc: "Description of what to do",
                  color: "bg-chart-3",
                },
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="relative">
                    <div
                      className={`size-8 rounded-full ${step.color} flex items-center justify-center`}
                    >
                      <span className="text-xs font-bold text-white">
                        {i + 1}
                      </span>
                    </div>
                    {i < 2 && (
                      <div className="absolute top-8 left-1/2 w-px h-6 bg-border -translate-x-1/2" />
                    )}
                  </div>
                  <div className="pt-1">
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-muted-foreground text-sm">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
