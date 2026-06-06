import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { Platform } from 'react-native';

const IOS_KEY     = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

export const ENTITLEMENT_ID = 'BPF App Pro';

// Call once at app start, before rendering anything
export function initializePurchases() {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) {
    console.warn('[RC] No RevenueCat API key found — check your .env file.');
    return;
  }

  Purchases.configure({ apiKey });
}

// Subscribe to real-time customer info updates.
// Returns a listener object with a .remove() method — call it in useEffect cleanup.
export function addCustomerInfoListener(callback) {
  return Purchases.addCustomerInfoUpdateListener(callback);
}

// Returns the current CustomerInfo or null on error
export async function getCustomerInfo() {
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.error('[RC] getCustomerInfo error:', e);
    return null;
  }
}

// Returns true when the user has an active "BPF App Pro" entitlement
export function isEntitlementActive(customerInfo) {
  return customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] != null;
}

// Returns true if the user has an active subscription
export async function checkSubscriptionStatus() {
  const info = await getCustomerInfo();
  return isEntitlementActive(info);
}

// Returns the current RevenueCat offering (contains your packages)
export async function getCurrentOffering() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (e) {
    console.error('[RC] getOfferings error:', e);
    return null;
  }
}

// Purchase a package — returns { success, customerInfo?, userCancelled?, error? }
export async function purchasePackage(pkg) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: isEntitlementActive(customerInfo), customerInfo };
  } catch (e) {
    if (!e.userCancelled) {
      console.error('[RC] purchasePackage error:', e);
    }
    return { success: false, userCancelled: e.userCancelled ?? false, error: e.message };
  }
}

// Restore previous purchases — returns { success, customerInfo?, error? }
export async function restorePurchases() {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { success: isEntitlementActive(customerInfo), customerInfo };
  } catch (e) {
    console.error('[RC] restorePurchases error:', e);
    return { success: false, error: e.message };
  }
}

// Opens the RevenueCat Customer Center (manage/cancel/refund)
export async function presentCustomerCenter() {
  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (e) {
    console.error('[RC] presentCustomerCenter error:', e);
  }
}
