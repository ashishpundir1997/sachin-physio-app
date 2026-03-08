"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { patientSchema, type PatientFormData } from "@/lib/validators";
import { Camera, X, User } from "lucide-react";

interface PatientFormProps {
  initialData?: PatientFormData & { id?: string };
}

export function PatientForm({ initialData }: PatientFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photoUrl || null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: initialData || {
      name: "",
      phone: "",
      age: null,
      gender: null,
      address: null,
      photoUrl: null,
      condition: null,
      notes: null,
    },
  });

  const gender = watch("gender");

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        setValue("photoUrl", url);
        toast.success("Photo uploaded");
      } else {
        toast.error("Failed to upload photo");
        setPhotoPreview(null);
      }
    } catch {
      toast.error("Failed to upload photo");
      setPhotoPreview(null);
    }
    setUploading(false);
  }

  function removePhoto() {
    setPhotoPreview(null);
    setValue("photoUrl", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(data: PatientFormData) {
    const url = isEditing ? `/api/patients/${initialData!.id}` : "/api/patients";
    const method = isEditing ? "PUT" : "POST";

    const payload = {
      ...data,
      age: data.age ? Number(data.age) : null,
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const patient = await res.json();
      toast.success(isEditing ? "Patient updated" : "Patient added");
      router.push(`/patients/${patient.id}`);
      router.refresh();
    } else {
      toast.error("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Photo Upload */}
      <div className="space-y-2">
        <Label>Patient Photo</Label>
        <div className="flex items-center gap-4">
          <div
            className="relative h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-gray-400" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white text-xs">...</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="h-3 w-3" />
              {photoPreview ? "Change Photo" : "Upload Photo"}
            </Button>
            {photoPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 text-red-500 hover:text-red-600"
                onClick={removePhoto}
              >
                <X className="h-3 w-3" />
                Remove
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" {...register("name")} placeholder="Patient name" />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input id="phone" {...register("phone")} placeholder="Phone number" />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            {...register("age", { setValueAs: (v) => (v === "" || v === undefined ? null : Number(v)) })}
            placeholder="Age"
          />
        </div>

        <div className="space-y-2">
          <Label>Gender</Label>
          <Select
            value={gender || ""}
            onValueChange={(val) => setValue("gender", val ?? null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" {...register("address")} placeholder="Address" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="condition">Condition / Diagnosis</Label>
        <Input
          id="condition"
          {...register("condition")}
          placeholder="e.g., Lower back pain, Frozen shoulder"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register("notes")}
          placeholder="Any additional notes..."
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting || uploading}>
          {isSubmitting
            ? "Saving..."
            : isEditing
            ? "Update Patient"
            : "Add Patient"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
