import axios from 'axios';

export interface DownloadResult {
  url: string;
  thumbnail?: string;
  title?: string;
  author?: string;
  type: 'video' | 'audio' | 'image';
  platform: 'tiktok' | 'instagram' | 'twitter' | 'threads' | 'unknown';
}

export async function extractMedia(inputUrl: string): Promise<DownloadResult> {
  const url = inputUrl.trim();
  
  if (url.includes('tiktok.com')) {
    return await downloadTikTok(url);
  } else if (url.includes('instagram.com')) {
    return await downloadInstagram(url);
  } else if (url.includes('twitter.com') || url.includes('x.com')) {
    return await downloadTwitter(url);
  } else if (url.includes('threads.net')) {
    return await downloadThreads(url);
  } else {
    throw new Error('Unsupported platform or invalid URL');
  }
}

async function downloadTikTok(url: string): Promise<DownloadResult> {
  try {
    // Using tikwm as a reliable free API
    const response = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
    const data = response.data.data;
    
    if (!data) throw new Error('Could not extract TikTok data');
    
    return {
      url: data.play || data.wmplay,
      thumbnail: data.cover,
      title: data.title,
      author: data.author?.nickname,
      type: 'video',
      platform: 'tiktok'
    };
  } catch (error) {
    console.error('TikTok download error:', error);
    throw new Error('Failed to download TikTok video');
  }
}

async function downloadInstagram(url: string): Promise<DownloadResult> {
  try {
    // IG is tricky without sessions. We'll attempt a public scraper if available.
    // For now, we'll use a placeholder or a common free api if one is found.
    // Attempting a generic scraper approach
    const res = await axios.get(`https://ig-downloader-api.example.com/download?url=${encodeURIComponent(url)}`).catch(() => null);
    
    if (res?.data) {
      return { ...res.data, platform: 'instagram' };
    }

    // Fallback: This is a complex task for a simple script, 
    // usually requires a dedicated rapidAPI or similar.
    throw new Error('Instagram downloader requires a private API key or session.');
  } catch (error) {
    throw new Error('Instagram extraction failed. IG often blocks headless requests.');
  }
}

async function downloadTwitter(url: string): Promise<DownloadResult> {
  try {
    // Similar to IG, X/Twitter is restrictive.
    // Try a known free api wrapper
    const res = await axios.get(`https://twitsave.com/info?url=${encodeURIComponent(url)}`).catch(() => null);
    // Note: Actually extracting from html would be more robust but complex.
    throw new Error('Twitter extraction failed. Requires specialized service.');
  } catch (error) {
    throw new Error('Twitter downloader temporarily unavailable.');
  }
}

async function downloadThreads(url: string): Promise<DownloadResult> {
  try {
    throw new Error('Threads extraction failed.');
  } catch (error) {
    throw new Error('Threads downloader temporarily unavailable.');
  }
}
