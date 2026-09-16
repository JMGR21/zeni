// Catálogo estático de los logros de Zeni — mismo patrón que el catálogo de
// instituciones de la Fase 4 (src/lib/institutions.ts): vive en código, no
// en una tabla, porque es metadata fija que no varía por usuario. Lo único
// que se persiste por usuario es qué logros ha desbloqueado
// (`user_achievements`).
//
// El requisito de cada logro (cuándo se otorga) no se guarda aquí — vive en
// la lógica de cada evaluador (ver src/lib/streak.ts para Categoría A,
// src/app/(app)/dashboard/actions.ts para B, etc.). Este archivo es solo la
// metadata mostrable: nombre, descripción, ícono, xp.
//
// Nota de alcance: el documento fuente ("Zeni — Sistema de Logros/Insignias")
// dice "53 logros" pero sus propias tablas suman 59 — se transcribieron las
// 59 filas tal como están documentadas, sin recortar ninguna.
//
// Sustituciones de ícono (el nombre sugerido no existe en react-icons/gi,
// se usó el más parecido disponible):
// - GiTreasureChest -> GiChest (guardian-del-tesoro)
// - GiBrokenChain -> GiManacles (deuda-liquidada)
// - GiPhoenixBird -> GiFalconMoon (fenix-financiero, ave-fenix-x3)
// - GiPerpetualMotion -> GiCycle (evolucion-constante)
// - GiLevelSix -> GiLevelFourAdvanced (guerrero-nivel-10)
// - GiBalancedScale -> GiScales (equilibrio)
// - GiTag -> GiPriceTag (tu-propia-categoria)
// - GiChain -> GiLinkedRings (todo-conectado)
// - GiRepair -> GiWrench (deuda-rescatada)

export type AchievementCategory =
  | "entrenamiento"
  | "presupuesto"
  | "ahorro"
  | "deuda"
  | "ki"
  | "transformaciones"
  | "general"
  | "habitos"
  | "ingresos"
  | "exploracion"
  | "resiliencia"
  | "secretos";

export interface AchievementDefinition {
  slug: string;
  category: AchievementCategory;
  name: string;
  description: string;
  icon: string; // nombre del componente de react-icons/gi
  xp: number;
  grantsLevelUp: boolean;
  secret: boolean; // true solo para la categoría L: no revelar la descripción hasta desbloquear
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  // A. Entrenamiento — constancia flexible
  {
    slug: "primer-ki",
    category: "entrenamiento",
    name: "Primer Ki",
    description: "Registraste tu primer movimiento",
    icon: "GiFootprint",
    xp: 20,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "guerrero-novato",
    category: "entrenamiento",
    name: "Guerrero Novato",
    description: "Dos semanas sin abandonar tu entrenamiento",
    icon: "GiRunningNinja",
    xp: 100,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "guerrero-constante",
    category: "entrenamiento",
    name: "Guerrero Constante",
    description: "Un mes de disciplina sostenida",
    icon: "GiMuscleUp",
    xp: 300,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "guerrero-de-acero",
    category: "entrenamiento",
    name: "Guerrero de Acero",
    description: "Cuatro meses sin perder el ritmo",
    icon: "GiBattleGear",
    xp: 800,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "maestro-del-ki",
    category: "entrenamiento",
    name: "Maestro del Ki",
    description: "Un año entero de constancia",
    icon: "GiLaurelsTrophy",
    xp: 2000,
    grantsLevelUp: true,
    secret: false,
  },

  // B. Presupuesto
  {
    slug: "disciplina-saiyan",
    category: "presupuesto",
    name: "Disciplina Saiyan",
    description: "Tu primer mes bajo control total",
    icon: "GiWallet",
    xp: 100,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "disciplina-de-hierro",
    category: "presupuesto",
    name: "Disciplina de Hierro",
    description: "Tres meses seguidos sin excederte",
    icon: "GiStonePile",
    xp: 400,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "disciplina-absoluta",
    category: "presupuesto",
    name: "Disciplina Absoluta",
    description: "Medio año de control total",
    icon: "GiStoneTower",
    xp: 900,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "maestro-del-presupuesto",
    category: "presupuesto",
    name: "Maestro del Presupuesto",
    description: "Un año entero sin salirte del plan",
    icon: "GiCrownedSkull",
    xp: 2000,
    grantsLevelUp: true,
    secret: false,
  },

  // C. Dragones de Ahorro
  {
    slug: "primera-esfera",
    category: "ahorro",
    name: "Primera Esfera",
    description: "Completaste tu primer hito de ahorro",
    icon: "GiCrystalBall",
    xp: 50,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "recolector-de-esferas",
    category: "ahorro",
    name: "Recolector de Esferas",
    description: "Ya sabes cómo se siente el progreso",
    icon: "GiStarsStack",
    xp: 250,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "guardian-del-tesoro",
    category: "ahorro",
    name: "Guardián del Tesoro",
    description: "Tu primera meta de ahorro, cumplida",
    icon: "GiChest",
    xp: 500,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "boveda-personal",
    category: "ahorro",
    name: "Bóveda Personal",
    description: "El ahorro ya es un hábito",
    icon: "GiPiggyBank",
    xp: 1000,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "maestro-del-ahorro",
    category: "ahorro",
    name: "Maestro del Ahorro",
    description: "Constructor serial de fondos",
    icon: "GiGoldStack",
    xp: 2000,
    grantsLevelUp: true,
    secret: false,
  },

  // D. Dragones de Deuda
  {
    slug: "primer-golpe",
    category: "deuda",
    name: "Primer Golpe",
    description: "Tu primer pago a una deuda",
    icon: "GiFist",
    xp: 50,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "deuda-bajo-control",
    category: "deuda",
    name: "Deuda Bajo Control",
    description: "Ya vas a la mitad",
    icon: "GiBrokenBone",
    xp: 300,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "deuda-liquidada",
    category: "deuda",
    name: "¡Deuda Liquidada!",
    description: "Rompiste tus primeras cadenas",
    icon: "GiManacles",
    xp: 800,
    grantsLevelUp: true,
    secret: false,
  },
  {
    slug: "cazador-de-deudas",
    category: "deuda",
    name: "Cazador de Deudas",
    description: "Ya sabes cómo se gana esta pelea",
    icon: "GiHandcuffs",
    xp: 1500,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "libre-de-cadenas",
    category: "deuda",
    name: "Libre de Cadenas",
    description: "Cero deudas activas al mismo tiempo",
    icon: "GiAngelWings",
    xp: 2500,
    grantsLevelUp: true,
    secret: false,
  },

  // E. Ki — hitos de energía
  {
    slug: "despertar",
    category: "ki",
    name: "Despertar",
    description: "Tu ki empieza a fluir",
    icon: "GiSunrise",
    xp: 150,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "guerrero-z",
    category: "ki",
    name: "Guerrero Z",
    description: "Ya no eres un principiante",
    icon: "GiKimono",
    xp: 400,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "es-un-super-saiyan",
    category: "ki",
    name: "¡Es un Super Saiyan!",
    description: "El momento que todos esperan",
    icon: "GiFireSilhouette",
    xp: 1000,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "mas-alla-de-un-super-saiyan",
    category: "ki",
    name: "Más Allá de un Super Saiyan",
    description: "Cima de la salud financiera",
    icon: "GiLightningTrio",
    xp: 2500,
    grantsLevelUp: true,
    secret: false,
  },
  {
    slug: "fenix-financiero",
    category: "ki",
    name: "Fénix Financiero",
    description: "Renaciste de la crisis",
    icon: "GiFalconMoon",
    xp: 1200,
    grantsLevelUp: false,
    secret: false,
  },

  // F. Transformaciones
  {
    slug: "primera-transformacion",
    category: "transformaciones",
    name: "Primera Transformación",
    description: "Tu ki evolucionó por primera vez",
    icon: "GiUpgrade",
    xp: 200,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "ciclo-de-evolucion",
    category: "transformaciones",
    name: "Ciclo de Evolución",
    description: "Ya subiste varias veces",
    icon: "GiSpiralArrow",
    xp: 700,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "evolucion-constante",
    category: "transformaciones",
    name: "Evolución Constante",
    description: "El progreso es tu costumbre",
    icon: "GiCycle",
    xp: 2000,
    grantsLevelUp: true,
    secret: false,
  },

  // G. Generales / antigüedad
  {
    slug: "guerrero-nivel-5",
    category: "general",
    name: "Guerrero Nivel 5",
    description: "Primer hito de nivel",
    icon: "GiLevelFour",
    xp: 200,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "guerrero-nivel-10",
    category: "general",
    name: "Guerrero Nivel 10",
    description: "Ya no eres nuevo",
    icon: "GiLevelFourAdvanced",
    xp: 500,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "leyenda-nivel-25",
    category: "general",
    name: "Leyenda Nivel 25",
    description: "Muy pocos llegan aquí",
    icon: "GiLevelEndFlag",
    xp: 1500,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "un-anio-de-entrenamiento",
    category: "general",
    name: "Un Año de Entrenamiento",
    description: "Zeni lleva un año contigo",
    icon: "GiHourglass",
    xp: 1000,
    grantsLevelUp: false,
    secret: false,
  },

  // H. Hábitos financieros saludables
  {
    slug: "primer-colchon",
    category: "habitos",
    name: "Primer Colchón",
    description: "Tu primer paso hacia un fondo real",
    icon: "GiPiggyBank",
    xp: 300,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "fondo-de-emergencia",
    category: "habitos",
    name: "Fondo de Emergencia",
    description: "La red de seguridad que todos necesitan",
    icon: "GiShield",
    xp: 800,
    grantsLevelUp: true,
    secret: false,
  },
  {
    slug: "fortaleza-financiera",
    category: "habitos",
    name: "Fortaleza Financiera",
    description: "Pocos llegan a este nivel de colchón",
    icon: "GiCastle",
    xp: 1500,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "sobre-el-minimo",
    category: "habitos",
    name: "Sobre el Mínimo",
    description: "Atacas tu deuda de verdad, no solo sobrevives",
    icon: "GiWeightLiftingUp",
    xp: 400,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "equilibrio",
    category: "habitos",
    name: "Equilibrio",
    description: "Más entra de lo que sale, y no por accidente",
    icon: "GiScales",
    xp: 400,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "doble-frente",
    category: "habitos",
    name: "Doble Frente",
    description: "Atacas deuda y ahorro al mismo tiempo",
    icon: "GiTwoCoins",
    xp: 300,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "todo-en-su-lugar",
    category: "habitos",
    name: "Todo en su Lugar",
    description: "Ningún gasto se te escapa sin explicación",
    icon: "GiCheckMark",
    xp: 200,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "decision-informada",
    category: "habitos",
    name: "Decisión Informada",
    description: "Comparaste tus opciones antes de decidir",
    icon: "GiCompass",
    xp: 100,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "puertas-cerradas",
    category: "habitos",
    name: "Puertas Cerradas",
    description: "Medio año sin abrir una deuda nueva",
    icon: "GiPadlock",
    xp: 600,
    grantsLevelUp: false,
    secret: false,
  },

  // I. Ingresos — crecimiento y diversificación
  {
    slug: "primer-ingreso-extra",
    category: "ingresos",
    name: "Primer Ingreso Extra",
    description: "Diversificaste antes de que fuera necesario",
    icon: "GiCash",
    xp: 100,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "multiples-fuentes",
    category: "ingresos",
    name: "Múltiples Fuentes",
    description: "Ya no dependes de un solo ingreso",
    icon: "GiReceiveMoney",
    xp: 300,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "mejor-mes",
    category: "ingresos",
    name: "Mejor Mes",
    description: "Superaste tu propio récord",
    icon: "GiMoneyStack",
    xp: 250,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "ingreso-en-ascenso",
    category: "ingresos",
    name: "Ingreso en Ascenso",
    description: "Tu ingreso crece, no solo tu gasto",
    icon: "GiStairsGoal",
    xp: 500,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "doble-fuente-sostenida",
    category: "ingresos",
    name: "Doble Fuente Sostenida",
    description: "La diversificación ya es costumbre",
    icon: "GiTwoCoins",
    xp: 700,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "ingreso-duplicado",
    category: "ingresos",
    name: "Ingreso Duplicado",
    description: "El esfuerzo por ganar más da frutos",
    icon: "GiPayMoney",
    xp: 1200,
    grantsLevelUp: true,
    secret: false,
  },

  // J. Exploración
  {
    slug: "tu-propia-categoria",
    category: "exploracion",
    name: "Tu Propia Categoría",
    description: "Personalizaste el sistema a tu medida",
    icon: "GiPriceTag",
    xp: 50,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "presupuesto-a-tu-manera",
    category: "exploracion",
    name: "Presupuesto a tu Manera",
    description: "No aceptaste la sugerencia sin más",
    icon: "GiPencil",
    xp: 50,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "detective-financiero",
    category: "exploracion",
    name: "Detective Financiero",
    description: "Encontraste lo que buscabas",
    icon: "GiMagnifyingGlass",
    xp: 30,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "identidad-completa",
    category: "exploracion",
    name: "Identidad Completa",
    description: "Tu perfil ya es tuyo",
    icon: "GiPerson",
    xp: 30,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "todo-conectado",
    category: "exploracion",
    name: "Todo Conectado",
    description: "Uniste tus movimientos con tus metas",
    icon: "GiLinkedRings",
    xp: 80,
    grantsLevelUp: false,
    secret: false,
  },

  // K. Resiliencia
  {
    slug: "segunda-oportunidad",
    category: "resiliencia",
    name: "Segunda Oportunidad",
    description: "Una racha rota no es el final",
    icon: "GiFalconMoon",
    xp: 150,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "mes-de-recuperacion",
    category: "resiliencia",
    name: "Mes de Recuperación",
    description: "Aprendiste de un tropiezo",
    icon: "GiHealing",
    xp: 300,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "ave-fenix-x3",
    category: "resiliencia",
    name: "Ave Fénix (x3)",
    description: "La crisis ya no te detiene",
    icon: "GiTripleYin",
    xp: 1000,
    grantsLevelUp: false,
    secret: false,
  },
  {
    slug: "deuda-rescatada",
    category: "resiliencia",
    name: "Deuda Rescatada",
    description: "Convertiste lo imposible en posible",
    icon: "GiWrench",
    xp: 400,
    grantsLevelUp: false,
    secret: false,
  },

  // L. Secretos (easter eggs)
  {
    slug: "esta-sobre-los-9000",
    category: "secretos",
    name: "¡Está Sobre los 9000!",
    description: "El guiño obligado",
    icon: "GiPowerLightning",
    xp: 90,
    grantsLevelUp: false,
    secret: true,
  },
  {
    slug: "entrenamiento-nocturno",
    category: "secretos",
    name: "Entrenamiento Nocturno",
    description: "Ni de noche descansas",
    icon: "GiOwl",
    xp: 50,
    grantsLevelUp: false,
    secret: true,
  },
  {
    slug: "madrugador-saiyan",
    category: "secretos",
    name: "Madrugador Saiyan",
    description: "El entrenamiento empieza antes que el sol",
    icon: "GiSunrise",
    xp: 50,
    grantsLevelUp: false,
    secret: true,
  },
  {
    slug: "numero-redondo",
    category: "secretos",
    name: "Número Redondo",
    description: "La casualidad también cuenta",
    icon: "GiRoundStar",
    xp: 30,
    grantsLevelUp: false,
    secret: true,
  },
];

export function getAchievement(slug: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.slug === slug);
}

// Orden y nombre de exhibición de cada categoría (A-L del documento
// fuente) — usado por la vitrina de logros para agrupar y titular cada
// sección en el mismo orden en que se documentaron.
export const ACHIEVEMENT_CATEGORY_ORDER: readonly AchievementCategory[] = [
  "entrenamiento",
  "presupuesto",
  "ahorro",
  "deuda",
  "ki",
  "transformaciones",
  "general",
  "habitos",
  "ingresos",
  "exploracion",
  "resiliencia",
  "secretos",
];

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  entrenamiento: "Entrenamiento",
  presupuesto: "Presupuesto",
  ahorro: "Dragones de Ahorro",
  deuda: "Dragones de Deuda",
  ki: "Ki",
  transformaciones: "Transformaciones",
  general: "Generales",
  habitos: "Hábitos financieros",
  ingresos: "Ingresos",
  exploracion: "Exploración",
  resiliencia: "Resiliencia",
  secretos: "Secretos",
};

export const TOTAL_ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;
