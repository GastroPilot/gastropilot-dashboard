"use client";

import {
  CheckCircle,
  Users,
  Info,
  ArrowRight,
  MapPin,
  UserCheck,
  AlertCircle,
  BookOpen,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const workflowSteps = [
  {
    step: 1,
    title: "Tisch zuweisen (optional)",
    description: "Ziehe eine Reservierung aus der Warteliste auf einen Tisch im Tischplan.",
    icon: MapPin,
    iconColor: "text-blue-400",
    bgColor: "bg-blue-900/20",
    borderColor: "border-blue-700/50",
    status: "bestätigt",
    statusColor: "text-blue-200",
    details: [
      "Drag & Drop von der Warteliste auf den gewünschten Tisch",
      "Status bleibt 'bestätigt'",
      "Tisch wird visuell als belegt markiert",
    ],
  },
  {
    step: 2,
    title: "Gäste da",
    description: "Klicke auf 'Gäste da', sobald die Gäste im Restaurant angekommen sind.",
    icon: UserCheck,
    iconColor: "text-green-400",
    bgColor: "bg-green-900/20",
    borderColor: "border-green-700/50",
    status: "platziert",
    statusColor: "text-green-300",
    details: [
      "Button 'Gäste da' in der Reservierungsansicht klicken",
      "Status wechselt zu 'platziert'",
      "Gäste sind jetzt offiziell am Tisch",
    ],
  },
  {
    step: 3,
    title: "Abschließen",
    description: "Klicke auf 'Abschließen', wenn die Gäste den Tisch verlassen haben.",
    icon: CheckCircle,
    iconColor: "text-amber-400",
    bgColor: "bg-amber-900/20",
    borderColor: "border-amber-700/50",
    status: "abgeschlossen",
    statusColor: "text-amber-300",
    details: [
      "Button 'Abschließen' klicken",
      "Status wechselt zu 'abgeschlossen'",
      "Tischbindung wird entfernt, Tisch ist wieder frei",
    ],
  },
];

const statusTransitions = [
  {
    title: "Standardfluss",
    icon: ArrowRight,
    iconColor: "text-blue-400",
    bgColor: "bg-blue-900/20",
    borderColor: "border-blue-700/50",
    transitions: [
      {
        from: "Bestätigt",
        to: "Gäste da",
        result: "Status: platziert",
      },
      {
        from: "Platziert",
        to: "Abschließen",
        result: "Status: abgeschlossen",
      },
    ],
  },
  {
    title: "Abweichungen",
    icon: AlertCircle,
    iconColor: "text-amber-400",
    bgColor: "bg-amber-900/20",
    borderColor: "border-amber-700/50",
    transitions: [
      { from: "Bestätigt", to: "No-Show", result: "Status: no_show" },
      { from: "Bestätigt", to: "Stornieren", result: "Status: storniert" },
    ],
  },
];

export default function HilfecenterPage() {
  return (
    <div className="h-full min-h-screen flex flex-col bg-gray-900 text-gray-100 overflow-auto">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 via-cyan-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Hilfecenter</h1>
              <p className="text-xs md:text-sm text-gray-400 mt-0.5">Tisch- & Reservierungsabläufe verstehen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 space-y-6">
          {/* Warum der Workflow? */}
          <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
            <CardHeader className="border-b border-gray-700">
              <CardTitle className="flex items-center gap-2 text-white">
                <Info className="w-5 h-5 text-blue-400" />
                Warum der Ablauf?
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-gray-300 leading-relaxed">
                Der klare Ablauf stellt sicher, dass Gäste erst platziert werden, wenn sie wirklich da sind, und dass
                Reservierungen sauber abgeschlossen werden. So bleiben Warteliste, Tischplan und Historie konsistent und
                nachvollziehbar.
              </p>
            </CardContent>
          </Card>

          {/* Workflow-Schritte */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              Workflow-Schritte
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Card
                    key={step.step}
                    className={`border-gray-700 bg-gray-800/50 backdrop-blur-sm ${step.borderColor}`}
                  >
                    <CardHeader className="border-b border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-8 rounded-lg ${step.bgColor} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${step.iconColor}`} />
                          </div>
                          <CardTitle className="text-base text-white">Schritt {step.step}</CardTitle>
                        </div>
                        {index < workflowSteps.length - 1 && <ArrowRight className="w-5 h-5 text-gray-600 hidden md:block" />}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-white font-semibold">{step.title}</p>
                        <span className={`text-xs font-semibold ${step.statusColor}`}>{step.status}</span>
                      </div>
                      <p className="text-sm text-gray-300">{step.description}</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                        {step.details.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Status-Übersicht */}
          <div className="grid md:grid-cols-2 gap-4">
            {statusTransitions.map((block) => {
              const Icon = block.icon;
              return (
                <Card
                  key={block.title}
                  className={`border-gray-700 bg-gray-800/50 backdrop-blur-sm ${block.borderColor}`}
                >
                  <CardHeader className="border-b border-gray-700">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Icon className={`w-5 h-5 ${block.iconColor}`} />
                      {block.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {block.transitions.map((t, idx) => (
                      <div key={`${block.title}-${idx}`} className={`p-3 rounded-lg ${block.bgColor} border border-gray-700/70`}>
                        <div className="flex items-center justify-between text-sm text-gray-200">
                          <span>{t.from}</span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <span>{t.to}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{t.result}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Tipps */}
          <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
            <CardHeader className="border-b border-gray-700">
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-blue-400" />
                Praktische Tipps
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-sm text-gray-300">
              <p>• Nutze Drag & Drop im Tischplan, um Reservierungen schnell zuzuweisen.</p>
              <p>• Halte den Status aktuell – das sorgt für klare Auslastung und Wartelisten.</p>
              <p>• Abschließen nach dem Besuch, damit der Tisch sofort wieder frei ist.</p>
            </CardContent>
          </Card>

          <div className="h-16" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
