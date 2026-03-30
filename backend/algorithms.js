// ===============================
// Blood Donor Finder - Algorithms
// ===============================

// Haversine formula: distance in km between two lat/lng points
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Blood group compatibility matrix
const COMPATIBILITY = {
  'O-':  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // universal donor
  'O+':  ['O+', 'A+', 'B+', 'AB+'],
  'A-':  ['A-', 'A+', 'AB-', 'AB+'],
  'A+':  ['A+', 'AB+'],
  'B-':  ['B-', 'B+', 'AB-', 'AB+'],
  'B+':  ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+']  // universal recipient
};

// Check if a donor's blood group can donate to the requested blood group
export function isCompatibleDonor(donorBloodGroup, requestedBloodGroup) {
  const canDonateTo = COMPATIBILITY[donorBloodGroup];
  return canDonateTo ? canDonateTo.includes(requestedBloodGroup) : false;
}

// 3-month (90 day) cooldown check
export function canDonateAgain(lastDonationDate) {
  if (!lastDonationDate) return true;
  const last = new Date(lastDonationDate).getTime();
  const now = Date.now();
  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
  return (now - last) >= NINETY_DAYS;
}

// Days remaining until donor can donate again
export function cooldownDaysRemaining(lastDonationDate) {
  if (!lastDonationDate) return 0;
  const last = new Date(lastDonationDate).getTime();
  const now = Date.now();
  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
  const diff = (last + NINETY_DAYS) - now;
  return diff > 0 ? Math.ceil(diff / (24 * 60 * 60 * 1000)) : 0;
}

// Find and rank donors for a blood request
export function rankDonorsForRequest(request, donors, radiusKm = 20) {
  return donors
    .filter(donor => {
      // Must be available
      if (!donor.isAvailable) return false;
      // Must match or be compatible blood group
      if (donor.bloodGroup !== request.bloodGroup && !isCompatibleDonor(donor.bloodGroup, request.bloodGroup)) return false;
      // Must pass cooldown
      if (!canDonateAgain(donor.lastDonation)) return false;
      return true;
    })
    .map(donor => {
      const distance = calculateDistance(
        request.location.lat, request.location.lng,
        donor.location.lat, donor.location.lng
      );
      return { ...donor, distance: Math.round(distance * 10) / 10 };
    })
    .filter(donor => donor.distance <= radiusKm) // radius filter
    .sort((a, b) => {
      // Exact match first, then by distance
      const aExact = a.bloodGroup === request.bloodGroup ? 0 : 1;
      const bExact = b.bloodGroup === request.bloodGroup ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return a.distance - b.distance;
    });
}

// Filter donors by search criteria
export function filterDonors(donors, { bloodGroup, city, radiusKm, centerLat, centerLng }) {
  return donors.filter(d => {
    if (d.role !== 'donor') return false;
    if (bloodGroup && d.bloodGroup !== bloodGroup) return false;
    if (city && d.location.city && !d.location.city.toLowerCase().includes(city.toLowerCase())) return false;
    if (radiusKm && centerLat && centerLng) {
      const dist = calculateDistance(centerLat, centerLng, d.location.lat, d.location.lng);
      if (dist > radiusKm) return false;
    }
    return true;
  });
}
