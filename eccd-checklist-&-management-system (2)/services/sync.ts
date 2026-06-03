
export const CLOUD_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-placeholder/exec";

export const syncToCloud = async (url: string, action: string, type: string, data?: any) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script often requires no-cors or handles redirects
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        type,
        data,
        timestamp: new Date().toISOString()
      }),
    });
    
    // With no-cors, we can't actually read the response, but we assume success if no error is thrown
    return { success: true };
  } catch (error) {
    console.error("Sync Error:", error);
    throw error;
  }
};
