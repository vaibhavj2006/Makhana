// Uses the browser's Geolocation API to get GPS coordinates, then reverse-geocodes
// them into a street address via OpenStreetMap's free Nominatim API (no API key needed).

async function fillAddressFromLocation(fieldIds, buttonEl) {
  if (!navigator.geolocation) {
    Toast.show("Your browser doesn't support location detection.");
    return;
  }

  const originalText = buttonEl.textContent;
  buttonEl.textContent = 'Locating…';
  buttonEl.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
        );
        if (!res.ok) throw new Error('Reverse geocoding failed');
        const data = await res.json();
        const addr = data.address || {};

        const line1Parts = [addr.house_number, addr.road || addr.pedestrian || addr.neighbourhood].filter(Boolean);
        const line1 = line1Parts.join(' ') || data.display_name?.split(',')[0] || '';
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const state = addr.state || '';
        const pincode = addr.postcode || '';

        if (fieldIds.line1 && line1) document.getElementById(fieldIds.line1).value = line1;
        if (fieldIds.city && city) document.getElementById(fieldIds.city).value = city;
        if (fieldIds.state && state) document.getElementById(fieldIds.state).value = state;
        if (fieldIds.pincode && pincode) document.getElementById(fieldIds.pincode).value = pincode;

        Toast.show('Address filled from your location — double check it before ordering.');
      } catch {
        Toast.show("Couldn't turn your location into an address. Please enter it manually.");
      } finally {
        buttonEl.textContent = originalText;
        buttonEl.disabled = false;
      }
    },
    (err) => {
      buttonEl.textContent = originalText;
      buttonEl.disabled = false;
      if (err.code === err.PERMISSION_DENIED) {
        Toast.show('Location permission denied. You can still enter your address manually.');
      } else {
        Toast.show("Couldn't get your location. Please enter your address manually.");
      }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}