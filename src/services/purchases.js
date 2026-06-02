import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

export const ENTITLEMENT_ID = 'premium';

const isConfigured = () => {
  const key = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  return key && !key.startsWith('appl_your') && !key.startsWith('goog_your');
};

// Call once on app start, before anything else
export function initializePurchases() {
  if (!isConfigured()) {
    console.warn('RevenueCat API key not set — subscription gate bypassed for testing.');
    return;
  }
  Purchases.configure({ apiKey: Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY });
}

// Returns true if the user has an active premium entitlement (including trial)
export async function checkSubscriptionStatus() {
  if (!isConfigured()) return true; // bypass paywall when no real RC key
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (e) {
    console.error('checkSubscriptionStatus error:', e);
    return false;
  }
}

// Returns the current offering (contains the annual package with trial)
export async function getCurrentOffering() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current || null;
  } catch (e) {
    console.error('getCurrentOffering error:', e);
    return null;
  }
}

// Purchase a specific package (the annual one)
// Returns { success: true } or { success: false, userCancelled: bool, error: string }
export async function purchasePackage(pkg) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return { success: isActive };
  } catch (e) {
    if (!e.userCancelled) {
      console.error('purchasePackage error:', e);
    }
    return { success: false, userCancelled: e.userCancelled || false, error: e.message };
  }
}

// Restore previous purchases (required by App Store guidelines)
export async function restorePurchases() {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return { success: isActive };
  } catch (e) {
    console.error('restorePurchases error:', e);
    return { success: false, error: e.message };
  }
}
