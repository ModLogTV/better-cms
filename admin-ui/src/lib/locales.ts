/** Extracts a region subtag from a BCP-47 code (e.g. "en-US" -> "US"), if present. */
export function countryFromLocaleCode(code: string): string | null {
	const region = code.split("-")[1];
	if (!region || region.length !== 2) return null;
	return region.toUpperCase();
}

export interface CuratedLocale {
	code: string;
	name: string;
	/** ISO 3166-1 alpha-2 country code — picks the flag from country-flag-icons. */
	country: string;
}

/**
 * Common BCP-47 locale codes with a representative region for flag display.
 * Not exhaustive — locales are dynamic/DB-managed (see CLAUDE.md), this is
 * just a curated set of suggestions for the "Add locale" combobox. Any code
 * can still be entered manually.
 */
export const CURATED_LOCALES: CuratedLocale[] = [
	{ code: "en-US", name: "English (United States)", country: "US" },
	{ code: "en-GB", name: "English (United Kingdom)", country: "GB" },
	{ code: "en-AU", name: "English (Australia)", country: "AU" },
	{ code: "en-CA", name: "English (Canada)", country: "CA" },
	{ code: "en-IN", name: "English (India)", country: "IN" },
	{ code: "en-PH", name: "English (Philippines)", country: "PH" },
	{ code: "en-SG", name: "English (Singapore)", country: "SG" },
	{ code: "en-NZ", name: "English (New Zealand)", country: "NZ" },
	{ code: "en-ZA", name: "English (South Africa)", country: "ZA" },
	{ code: "de-DE", name: "German (Germany)", country: "DE" },
	{ code: "de-AT", name: "German (Austria)", country: "AT" },
	{ code: "de-CH", name: "German (Switzerland)", country: "CH" },
	{ code: "fr-FR", name: "French (France)", country: "FR" },
	{ code: "fr-CA", name: "French (Canada)", country: "CA" },
	{ code: "fr-BE", name: "French (Belgium)", country: "BE" },
	{ code: "es-ES", name: "Spanish (Spain)", country: "ES" },
	{ code: "es-MX", name: "Spanish (Mexico)", country: "MX" },
	{ code: "es-AR", name: "Spanish (Argentina)", country: "AR" },
	{ code: "pt-PT", name: "Portuguese (Portugal)", country: "PT" },
	{ code: "pt-BR", name: "Portuguese (Brazil)", country: "BR" },
	{ code: "it-IT", name: "Italian (Italy)", country: "IT" },
	{ code: "nl-NL", name: "Dutch (Netherlands)", country: "NL" },
	{ code: "nl-BE", name: "Dutch (Belgium)", country: "BE" },
	{ code: "sv-SE", name: "Swedish (Sweden)", country: "SE" },
	{ code: "da-DK", name: "Danish (Denmark)", country: "DK" },
	{ code: "no-NO", name: "Norwegian (Norway)", country: "NO" },
	{ code: "fi-FI", name: "Finnish (Finland)", country: "FI" },
	{ code: "pl-PL", name: "Polish (Poland)", country: "PL" },
	{ code: "cs-CZ", name: "Czech (Czechia)", country: "CZ" },
	{ code: "sk-SK", name: "Slovak (Slovakia)", country: "SK" },
	{ code: "hu-HU", name: "Hungarian (Hungary)", country: "HU" },
	{ code: "ro-RO", name: "Romanian (Romania)", country: "RO" },
	{ code: "bg-BG", name: "Bulgarian (Bulgaria)", country: "BG" },
	{ code: "el-GR", name: "Greek (Greece)", country: "GR" },
	{ code: "tr-TR", name: "Turkish (Turkey)", country: "TR" },
	{ code: "ru-RU", name: "Russian (Russia)", country: "RU" },
	{ code: "uk-UA", name: "Ukrainian (Ukraine)", country: "UA" },
	{ code: "he-IL", name: "Hebrew (Israel)", country: "IL" },
	{ code: "ar-SA", name: "Arabic (Saudi Arabia)", country: "SA" },
	{ code: "ar-AE", name: "Arabic (United Arab Emirates)", country: "AE" },
	{ code: "ar-EG", name: "Arabic (Egypt)", country: "EG" },
	{ code: "hi-IN", name: "Hindi (India)", country: "IN" },
	{ code: "zh-CN", name: "Chinese, Simplified (China)", country: "CN" },
	{ code: "zh-TW", name: "Chinese, Traditional (Taiwan)", country: "TW" },
	{ code: "zh-HK", name: "Chinese (Hong Kong)", country: "HK" },
	{ code: "ja-JP", name: "Japanese (Japan)", country: "JP" },
	{ code: "ko-KR", name: "Korean (South Korea)", country: "KR" },
	{ code: "th-TH", name: "Thai (Thailand)", country: "TH" },
	{ code: "vi-VN", name: "Vietnamese (Vietnam)", country: "VN" },
	{ code: "id-ID", name: "Indonesian (Indonesia)", country: "ID" },
	{ code: "ms-MY", name: "Malay (Malaysia)", country: "MY" },
	{ code: "fil-PH", name: "Filipino (Philippines)", country: "PH" },
	{ code: "af-ZA", name: "Afrikaans (South Africa)", country: "ZA" },
	{ code: "sw-KE", name: "Swahili (Kenya)", country: "KE" },
	{ code: "fa-IR", name: "Persian (Iran)", country: "IR" },
	{ code: "ur-PK", name: "Urdu (Pakistan)", country: "PK" },
	{ code: "bn-BD", name: "Bengali (Bangladesh)", country: "BD" },
];
