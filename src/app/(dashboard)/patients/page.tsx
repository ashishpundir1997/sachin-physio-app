"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  gender: string | null;
  condition: string | null;
  photoUrl: string | null;
  _count: { appointments: number; sessions: number; payments: number };
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/patients")
      .then((res) => res.json())
      .then((data) => {
        setPatients(data);
        setLoading(false);
      });
  }, []);

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Patients</h1>
        <Link href="/patients/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Patient
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? "No patients match your search" : "No patients yet. Add your first patient!"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((patient) => (
            <Link key={patient.id} href={`/patients/${patient.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {patient.photoUrl ? (
                        <img
                          src={patient.photoUrl}
                          alt={patient.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{patient.name}</h3>
                      <p className="text-sm text-muted-foreground">{patient.phone}</p>
                      {patient.condition && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {patient.condition}
                        </Badge>
                      )}
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{patient._count.appointments} appts</span>
                        <span>{patient._count.sessions} sessions</span>
                      </div>
                    </div>
                    {patient.age && (
                      <span className="text-sm text-muted-foreground">
                        {patient.age}y
                        {patient.gender ? `, ${patient.gender.charAt(0).toUpperCase()}` : ""}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
