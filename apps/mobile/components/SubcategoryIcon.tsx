// Static requires keyed by "categorySlug/subcategorySlug"
const SUBCATEGORY_SVG_ICONS: Record<string, number> = {
  // Automotive
  "automotive/customs": require("@/assets/categories-svg/automotive-svg/customs.svg"),
  "automotive/detailing": require("@/assets/categories-svg/automotive-svg/detailing.svg"),
  "automotive/mechanic": require("@/assets/categories-svg/automotive-svg/mechanic.svg"),
  "automotive/roadside": require("@/assets/categories-svg/automotive-svg/roadside.svg"),
  "automotive/servicing": require("@/assets/categories-svg/automotive-svg/servicing.svg"),
  "automotive/tires": require("@/assets/categories-svg/automotive-svg/tires.svg"),
  // Beauty
  "beauty/barbering": require("@/assets/categories-svg/beauty-svg/barbering.svg"),
  "beauty/cosmetic": require("@/assets/categories-svg/beauty-svg/cosmetic.svg"),
  "beauty/lash-tech": require("@/assets/categories-svg/beauty-svg/lash-tech.svg"),
  "beauty/makeup": require("@/assets/categories-svg/beauty-svg/makeup.svg"),
  "beauty/nail": require("@/assets/categories-svg/beauty-svg/nail.svg"),
  "beauty/skin-art": require("@/assets/categories-svg/beauty-svg/skin-art.svg"),
  "beauty/skincare": require("@/assets/categories-svg/beauty-svg/skincare.svg"),
  "beauty/stylist": require("@/assets/categories-svg/beauty-svg/stylist.svg"),
  // Caregiving
  "caregiving/babysitting": require("@/assets/categories-svg/caregiving-svg/babysitting.svg"),
  "caregiving/daycare": require("@/assets/categories-svg/caregiving-svg/daycare.svg"),
  "caregiving/disability": require("@/assets/categories-svg/caregiving-svg/disability.svg"),
  "caregiving/medical": require("@/assets/categories-svg/caregiving-svg/medical.svg"),
  "caregiving/seniors": require("@/assets/categories-svg/caregiving-svg/seniors.svg"),
  "caregiving/tutoring": require("@/assets/categories-svg/caregiving-svg/tutoring.svg"),
  // Culinary
  "culinary/baking": require("@/assets/categories-svg/culinary-svg/baking.svg"),
  "culinary/bartenders": require("@/assets/categories-svg/culinary-svg/bartenders.svg"),
  "culinary/catering": require("@/assets/categories-svg/culinary-svg/catering.svg"),
  "culinary/chef": require("@/assets/categories-svg/culinary-svg/chef.svg"),
  "culinary/classes": require("@/assets/categories-svg/culinary-svg/classes.svg"),
  "culinary/meal-prep": require("@/assets/categories-svg/culinary-svg/meal-prep.svg"),
  // Delivery
  "delivery/courier": require("@/assets/categories-svg/delivery-svg/courier.svg"),
  "delivery/errands": require("@/assets/categories-svg/delivery-svg/errands.svg"),
  "delivery/grocery": require("@/assets/categories-svg/delivery-svg/grocery.svg"),
  "delivery/movers": require("@/assets/categories-svg/delivery-svg/movers.svg"),
  // Education
  "education/careers": require("@/assets/categories-svg/education-svg/careers.svg"),
  "education/consulting": require("@/assets/categories-svg/education-svg/consulting.svg"),
  "education/language": require("@/assets/categories-svg/education-svg/language.svg"),
  "education/skill-based": require("@/assets/categories-svg/education-svg/skill-based.svg"),
  "education/test-prep": require("@/assets/categories-svg/education-svg/test-prep.svg"),
  "education/tutoring": require("@/assets/categories-svg/education-svg/tutoring.svg"),
  // Events
  "events/catering": require("@/assets/categories-svg/events-svg/catering.svg"),
  "events/decorating": require("@/assets/categories-svg/events-svg/decorating.svg"),
  "events/hosting": require("@/assets/categories-svg/events-svg/hosting.svg"),
  "events/live-music": require("@/assets/categories-svg/events-svg/live-music.svg"),
  "events/media": require("@/assets/categories-svg/events-svg/media.svg"),
  "events/mobility": require("@/assets/categories-svg/events-svg/mobility.svg"),
  "events/planning": require("@/assets/categories-svg/events-svg/planning.svg"),
  "events/production": require("@/assets/categories-svg/events-svg/production.svg"),
  "events/rentals": require("@/assets/categories-svg/events-svg/rentals.svg"),
  // Fitness
  "fitness/boxing": require("@/assets/categories-svg/fitness-svg/boxing.svg"),
  "fitness/coaching": require("@/assets/categories-svg/fitness-svg/coaching.svg"),
  "fitness/crossfit": require("@/assets/categories-svg/fitness-svg/crossfit.svg"),
  "fitness/dance": require("@/assets/categories-svg/fitness-svg/dance.svg"),
  "fitness/trainers": require("@/assets/categories-svg/fitness-svg/trainers.svg"),
  "fitness/yoga-pilates": require("@/assets/categories-svg/fitness-svg/yoga-pilates.svg"),
  // IT
  "it/data-entry": require("@/assets/categories-svg/it-svg/data-entry.svg"),
  "it/it-support": require("@/assets/categories-svg/it-svg/it-support.svg"),
  "it/mobile": require("@/assets/categories-svg/it-svg/mobile.svg"),
  "it/security": require("@/assets/categories-svg/it-svg/security.svg"),
  "it/seo": require("@/assets/categories-svg/it-svg/seo.svg"),
  "it/ui-ux": require("@/assets/categories-svg/it-svg/ui-ux.svg"),
  "it/website": require("@/assets/categories-svg/it-svg/website.svg"),
  // Maintenance
  "maintenance/appliances": require("@/assets/categories-svg/maintenance-svg/appliances.svg"),
  "maintenance/carpenter": require("@/assets/categories-svg/maintenance-svg/carpenter.svg"),
  "maintenance/electrician": require("@/assets/categories-svg/maintenance-svg/electrician.svg"),
  "maintenance/gardening": require("@/assets/categories-svg/maintenance-svg/gardening.svg"),
  "maintenance/hvac": require("@/assets/categories-svg/maintenance-svg/hvac.svg"),
  "maintenance/painter": require("@/assets/categories-svg/maintenance-svg/painter.svg"),
  "maintenance/paving": require("@/assets/categories-svg/maintenance-svg/paving.svg"),
  "maintenance/pest": require("@/assets/categories-svg/maintenance-svg/pest.svg"),
  "maintenance/plumber": require("@/assets/categories-svg/maintenance-svg/plumber.svg"),
  "maintenance/roofing": require("@/assets/categories-svg/maintenance-svg/roofing.svg"),
  // Media
  "media/editing": require("@/assets/categories-svg/media-svg/editing.svg"),
  "media/graphics": require("@/assets/categories-svg/media-svg/graphics.svg"),
  "media/influencer": require("@/assets/categories-svg/media-svg/influencer.svg"),
  "media/socials": require("@/assets/categories-svg/media-svg/socials.svg"),
  "media/visuals": require("@/assets/categories-svg/media-svg/visuals.svg"),
  "media/writing": require("@/assets/categories-svg/media-svg/writing.svg"),
  // Misc.
  "misc/decor": require("@/assets/categories-svg/misc-svg/decor.svg"),
  "misc/gardening": require("@/assets/categories-svg/misc-svg/gardening.svg"),
  "misc/interpreters": require("@/assets/categories-svg/misc-svg/interpreters.svg"),
  "misc/legal-cpa": require("@/assets/categories-svg/misc-svg/legal-cpa.svg"),
  "misc/movers": require("@/assets/categories-svg/misc-svg/movers.svg"),
  "misc/organizing": require("@/assets/categories-svg/misc-svg/organizing.svg"),
  "misc/security": require("@/assets/categories-svg/misc-svg/security.svg"),
  "misc/travel": require("@/assets/categories-svg/misc-svg/travel.svg"),
  // Music
  "music/coaching": require("@/assets/categories-svg/music-svg/coaching.svg"),
  "music/education": require("@/assets/categories-svg/music-svg/education.svg"),
  "music/live-music": require("@/assets/categories-svg/music-svg/live-music.svg"),
  "music/production": require("@/assets/categories-svg/music-svg/production.svg"),
  // Personal
  "personal/counseling": require("@/assets/categories-svg/personal-svg/counseling.svg"),
  "personal/dietitian": require("@/assets/categories-svg/personal-svg/dietitian.svg"),
  "personal/holistic": require("@/assets/categories-svg/personal-svg/holistic.svg"),
  "personal/massage": require("@/assets/categories-svg/personal-svg/massage.svg"),
  "personal/meditation": require("@/assets/categories-svg/personal-svg/meditation.svg"),
  "personal/rehab": require("@/assets/categories-svg/personal-svg/rehab.svg"),
  // Pet Care
  "pet-care/dog-walking": require("@/assets/categories-svg/pet-care-svg/dog-walking.svg"),
  "pet-care/grooming": require("@/assets/categories-svg/pet-care-svg/grooming.svg"),
  "pet-care/pet-sitting": require("@/assets/categories-svg/pet-care-svg/pet-sitting.svg"),
  "pet-care/pet-training": require("@/assets/categories-svg/pet-care-svg/pet-training.svg"),
  "pet-care/pet-transport": require("@/assets/categories-svg/pet-care-svg/pet-transport.svg"),
  "pet-care/veterinary": require("@/assets/categories-svg/pet-care-svg/veterinary.svg"),
  // Sanitation
  "sanitation/flooring": require("@/assets/categories-svg/sanitation-svg/flooring.svg"),
  "sanitation/laundry": require("@/assets/categories-svg/sanitation-svg/laundry.svg"),
  "sanitation/office": require("@/assets/categories-svg/sanitation-svg/office.svg"),
  "sanitation/residential": require("@/assets/categories-svg/sanitation-svg/residential.svg"),
  "sanitation/trash": require("@/assets/categories-svg/sanitation-svg/trash.svg"),
  "sanitation/window": require("@/assets/categories-svg/sanitation-svg/window.svg"),
};

export function getSubcategoryIcon(
  categorySlug: string,
  subcategoryName: string,
): number | undefined {
  const subSlug = subcategoryName
    .toLowerCase()
    .replace(/[\s/&]+/g, "-")
    .replace(/-+/g, "-");
  return SUBCATEGORY_SVG_ICONS[`${categorySlug}/${subSlug}`];
}

export function categoryNameToSlug(name: string): string {
  return name.toLowerCase().replace(/\.$/, "").replace(/\s+/g, "-");
}
