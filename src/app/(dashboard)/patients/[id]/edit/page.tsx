"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PatientForm } from "@/components/patients/patient-form";

export default function EditPatientPage() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/patients/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPatient(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Patient</h1>
      {patient && <PatientForm initialData={patient} />}
    </div>
  );
}
