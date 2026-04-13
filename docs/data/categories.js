export const CATEGORIES = {
  "child-care": {
    label: { en: "Child Care", es: "Cuidado infantil" },
    tooltip: {
      en: "Child Care: Resources for families with young children, including childcare programs, early education, and youth services.",
      es: "Cuidado infantil: Recursos para familias con niños pequeños, incluyendo programas de cuidado infantil, educación temprana y servicios juveniles."
    },
    services: ["childcare", "education", "youth-services"],
    centered: ["kids"]
  },
  "personal-care": {
    label: { en: "Personal Items & Care", es: "Artículos y cuidado personal" },
    tooltip: {
      en: "Personal Items & Care: Free clothing, hygiene supplies, showers, laundry, and safe daytime spaces.",
      es: "Artículos y cuidado personal: Ropa gratuita, suministros de higiene, duchas, lavandería y espacios diurnos seguros."
    },
    services: ["clothing", "hygiene", "showers", "laundry", "day-space"],
    centered: []
  },
  "crisis": {
    label: { en: "Crisis Services", es: "Servicios de crisis" },
    tooltip: {
      en: "Crisis Services: Immediate help in emergencies — crisis hotlines, emergency shelter, and urgent support when you need it most.",
      es: "Servicios de crisis: Ayuda inmediata en emergencias — líneas de crisis, refugio de emergencia y apoyo urgente cuando más lo necesitas."
    },
    services: ["crisis", "shelter", "housing-emergency", "harm-reduction"],
    centered: []
  },
  "disability": {
    label: { en: "Disability Services", es: "Servicios para personas con discapacidad" },
    tooltip: {
      en: "Disability Services: Support for people living with physical, developmental, or mental health disabilities, including case management and benefits navigation.",
      es: "Servicios para personas con discapacidad: Apoyo para personas con discapacidades físicas, del desarrollo o de salud mental, incluyendo gestión de casos y navegación de beneficios."
    },
    services: ["case-management", "benefits-navigation", "community-referrals", "mental-health"],
    centered: []
  },
  "education": {
    label: { en: "Education", es: "Educación" },
    tooltip: {
      en: "Education: Learning programs, digital literacy, GED support, tutoring, and skills training for all ages.",
      es: "Educación: Programas de aprendizaje, alfabetización digital, apoyo para el GED, tutoría y capacitación en habilidades para todas las edades."
    },
    services: ["education", "digital-literacy", "job-training", "youth-services"],
    centered: []
  },
  "employment": {
    label: { en: "Employment", es: "Empleo" },
    tooltip: {
      en: "Employment: Job placement, workforce training, resume help, and employment services to help you find and keep work.",
      es: "Empleo: Colocación laboral, capacitación laboral, ayuda con currículum y servicios de empleo para ayudarte a encontrar y mantener trabajo."
    },
    services: ["employment", "job-training", "job-readiness", "benefits-navigation"],
    centered: []
  },
  "food": {
    label: { en: "Food", es: "Alimentos" },
    tooltip: {
      en: "Food: Food pantries, hot meals, grocery delivery, and food assistance programs. No eligibility requirements at most locations.",
      es: "Alimentos: Despensas de alimentos, comidas calientes, entrega de comestibles y programas de asistencia alimentaria. Sin requisitos de elegibilidad en la mayoría de los lugares."
    },
    services: ["food", "hot-meals", "food-delivery"],
    centered: []
  },
  "healthcare": {
    label: { en: "Health Care", es: "Atención médica" },
    tooltip: {
      en: "Health Care: Free and low-cost medical care, dental, reproductive health, HIV/STI testing, PrEP, HRT, and harm reduction — regardless of insurance or immigration status.",
      es: "Atención médica: Atención médica gratuita y de bajo costo, dental, salud reproductiva, pruebas de VIH/ITS, PrEP, TRH y reducción de daños — independientemente del seguro o estatus migratorio."
    },
    services: ["healthcare", "dental", "reproductive-health", "sti-testing", "prep", "hrt", "harm-reduction", "benefits-navigation"],
    centered: []
  },
  "housing": {
    label: { en: "Housing", es: "Vivienda" },
    tooltip: {
      en: "Housing: Emergency shelter, transitional and affordable housing, rental assistance, heating and cooling bill help, tenant rights, and help with evictions and housing violations.",
      es: "Vivienda: Refugio de emergencia, vivienda transitoria y asequible, asistencia de alquiler, ayuda con facturas de calefacción y refrigeración, derechos de inquilinos y ayuda con desalojos y violaciones de vivienda."
    },
    services: ["housing-emergency", "housing-transitional", "housing-affordable", "housing-financial-aid", "housing-ownership-prep", "shelter", "legal-tenant-rights"],
    centered: []
  },
  "immigration": {
    label: { en: "Immigration", es: "Inmigración" },
    tooltip: {
      en: "Immigration: Legal help for immigrants and refugees — DACA, asylum, deportation defense, Know Your Rights, and connecting to services regardless of status.",
      es: "Inmigración: Ayuda legal para inmigrantes y refugiados — DACA, asilo, defensa contra deportación, Conoce Tus Derechos y conexión a servicios independientemente del estatus."
    },
    services: ["legal-immigration", "immigration", "daca", "know-your-rights", "case-management", "benefits-navigation"],
    centered: ["immigrant", "undocumented", "asylum-seeker"]
  },
  "legal": {
    label: { en: "Legal Assistance", es: "Asistencia legal" },
    tooltip: {
      en: "Legal Assistance: Free civil legal services covering housing, family law, immigration, workers' rights, criminal records, name changes, and more.",
      es: "Asistencia legal: Servicios legales civiles gratuitos que cubren vivienda, derecho familiar, inmigración, derechos laborales, antecedentes penales, cambios de nombre y más."
    },
    services: ["legal", "legal-tenant-rights", "legal-immigration", "legal-name-change", "know-your-rights", "daca"],
    centered: []
  },
  "mental-health": {
    label: { en: "Mental Health", es: "Salud mental" },
    tooltip: {
      en: "Mental Health: Counseling, therapy, support groups, and psychiatric services. Free and low-cost options available regardless of insurance.",
      es: "Salud mental: Asesoramiento, terapia, grupos de apoyo y servicios psiquiátricos. Opciones gratuitas y de bajo costo disponibles independientemente del seguro."
    },
    services: ["mental-health", "crisis", "case-management"],
    centered: []
  },
  "reentry": {
    label: { en: "Reentry", es: "Reinserción" },
    tooltip: {
      en: "Reentry: Support for people returning home after incarceration — housing, employment, legal help, ID assistance, and community connections.",
      es: "Reinserción: Apoyo para personas que regresan a casa después de la encarcelación — vivienda, empleo, ayuda legal, asistencia con identificación y conexiones comunitarias."
    },
    services: ["reentry", "case-management", "employment", "housing-emergency", "housing-transitional", "legal", "benefits-navigation", "know-your-rights"],
    centered: ["returning-residents"]
  },
  "senior-services": {
    label: { en: "Senior Services", es: "Servicios para adultos mayores" },
    tooltip: {
      en: "Senior Services: Resources specifically for older adults, including healthcare, food programs, housing assistance, benefits navigation, and social support.",
      es: "Servicios para adultos mayores: Recursos específicamente para adultos mayores, incluyendo atención médica, programas de alimentos, asistencia de vivienda, navegación de beneficios y apoyo social."
    },
    services: ["case-management", "healthcare", "food", "benefits-navigation", "housing-financial-aid", "mental-health", "community-referrals"],
    centered: ["senior"]
  },
  "substance-use": {
    label: { en: "Substance Use", es: "Uso de sustancias" },
    tooltip: {
      en: "Substance Use: Treatment, detox, medication-assisted treatment (MAT), harm reduction, and recovery support — without judgment.",
      es: "Uso de sustancias: Tratamiento, desintoxicación, tratamiento asistido por medicamentos (MAT), reducción de daños y apoyo para la recuperación — sin juicios."
    },
    services: ["substance-use", "harm-reduction", "mental-health", "crisis", "case-management", "housing-transitional"],
    centered: []
  }
};

export const CATEGORY_IDS = Object.keys(CATEGORIES);

export function expandNeeds(needsArray) {
  if (!needsArray || needsArray.length === 0) return new Set();
  const tags = new Set();
  for (const need of needsArray) {
    const cat = CATEGORIES[need];
    if (cat) cat.services.forEach(s => tags.add(s));
  }
  return tags;
}

export function normalizeParams(needs, services) {
  // Pass 1: resolve full active service set
  const expanded = new Set([...expandNeeds(needs), ...services]);

  // Pass 2: determine which categories are fully active
  const activeNeeds = [];
  for (const [id, cat] of Object.entries(CATEGORIES)) {
    if (cat.services.every(s => expanded.has(s))) {
      activeNeeds.push(id);
    }
  }

  // Pass 3: clean services - remove what's covered by active needs
  const coveredByNeeds = expandNeeds(activeNeeds);
  const cleanServices = [...expanded].filter(s => !coveredByNeeds.has(s));

  return { needs: activeNeeds, services: cleanServices };
}
