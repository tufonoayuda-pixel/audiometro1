"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PatientData } from "@/pages/AudiometerPage"; // Import the interface

interface PatientFormProps {
  patientData: PatientData;
  setPatientData: React.Dispatch<React.SetStateAction<PatientData>>;
}

const formSchema = z.object({
  fullName: z.string().min(1, { message: "El nombre completo es obligatorio." }),
  age: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(0, { message: "La edad no puede ser negativa." }).max(120, { message: "La edad es irreal." })
  ),
  evaluationDate: z.date({
    required_error: "La fecha de evaluación es obligatoria.",
  }),
  hearingLossType: z.enum(['Conductiva', 'Neurosensorial', 'Mixta', 'Normal', 'No determinada'], {
    required_error: "El tipo de hipoacusia es obligatorio.",
  }),
  affectedEarRight: z.boolean().default(false),
  affectedEarLeft: z.boolean().default(false),
  affectedEarBilateral: z.boolean().default(false),
  hasHearingAids: z.enum(['yes', 'no'], {
    required_error: "¿Es portador de audífonos protésicos? es obligatorio.",
  }),
  examinerName: z.string().min(1, { message: "El nombre del examinador es obligatorio." }),
}).refine(data => data.affectedEarRight || data.affectedEarLeft || data.affectedEarBilateral, {
  message: "Debes seleccionar al menos un oído afectado.",
  path: ["affectedEarRight"], // Attach error to one of the checkboxes
});

export const PatientForm: React.FC<PatientFormProps> = ({ patientData, setPatientData }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: patientData.fullName,
      age: patientData.age === '' ? undefined : patientData.age,
      evaluationDate: patientData.evaluationDate,
      hearingLossType: patientData.hearingLossType === '' ? undefined : patientData.hearingLossType,
      affectedEarRight: patientData.affectedEar.right,
      affectedEarLeft: patientData.affectedEar.left,
      affectedEarBilateral: patientData.affectedEar.bilateral,
      hasHearingAids: patientData.hasHearingAids === '' ? undefined : patientData.hasHearingAids,
      examinerName: patientData.examinerName,
    },
  });

  // Update form defaults when patientData changes
  React.useEffect(() => {
    form.reset({
      fullName: patientData.fullName,
      age: patientData.age === '' ? undefined : patientData.age,
      evaluationDate: patientData.evaluationDate,
      hearingLossType: patientData.hearingLossType === '' ? undefined : patientData.hearingLossType,
      affectedEarRight: patientData.affectedEar.right,
      affectedEarLeft: patientData.affectedEar.left,
      affectedEarBilateral: patientData.affectedEar.bilateral,
      hasHearingAids: patientData.hasHearingAids === '' ? undefined : patientData.hasHearingAids,
      examinerName: patientData.examinerName,
    });
  }, [patientData, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setPatientData({
      fullName: values.fullName,
      age: values.age,
      evaluationDate: values.evaluationDate,
      hearingLossType: values.hearingLossType,
      affectedEar: {
        right: values.affectedEarRight,
        left: values.affectedEarLeft,
        bilateral: values.affectedEarBilateral,
      },
      hasHearingAids: values.hasHearingAids,
      examinerName: values.examinerName,
    });
    // Optionally, save to localStorage or show a toast
    console.log("Patient data updated:", values);
  };

  // Use form.watch to update parent state immediately on change
  React.useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name) {
        const updatedData: Partial<PatientData> = {};
        if (name === 'fullName') updatedData.fullName = value.fullName || '';
        if (name === 'age') updatedData.age = value.age === undefined ? '' : value.age;
        if (name === 'evaluationDate') updatedData.evaluationDate = value.evaluationDate || new Date();
        if (name === 'hearingLossType') updatedData.hearingLossType = value.hearingLossType || '';
        if (name === 'hasHearingAids') updatedData.hasHearingAids = value.hasHearingAids || '';
        if (name === 'examinerName') updatedData.examinerName = value.examinerName || '';
        
        if (name.startsWith('affectedEar')) {
          updatedData.affectedEar = {
            right: value.affectedEarRight || false,
            left: value.affectedEarLeft || false,
            bilateral: value.affectedEarBilateral || false,
          };
        }
        setPatientData((prev) => ({ ...prev, ...updatedData }));
      }
    });
    return () => subscription.unsubscribe();
  }, [form, setPatientData]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo del paciente</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Juan Pérez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Edad (años)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ej: 30" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="evaluationDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha de evaluación</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Selecciona una fecha</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hearingLossType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de hipoacusia</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Conductiva">Conductiva</SelectItem>
                  <SelectItem value="Neurosensorial">Neurosensorial</SelectItem>
                  <SelectItem value="Mixta">Mixta</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="No determinada">No determinada</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Oído afectado</FormLabel>
          <div className="flex flex-col space-y-2">
            <FormField
              control={form.control}
              name="affectedEarRight"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Derecho</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="affectedEarLeft"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Izquierdo</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="affectedEarBilateral"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Bilateral</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
          <FormMessage>{form.formState.errors.affectedEarRight?.message}</FormMessage>
        </FormItem>

        <FormField
          control={form.control}
          name="hasHearingAids"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>¿Es portador de audífonos protésicos?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="yes" />
                    </FormControl>
                    <FormLabel className="font-normal">Sí</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="no" />
                    </FormControl>
                    <FormLabel className="font-normal">No</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="examinerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del examinador</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Dra. Ana García" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};