// Structured "About ICRCS" applicant guide, rendered by AboutDialog. Kept out of
// the i18n string table because it's a whole document (headings, lists, steps)
// rather than discrete UI strings.

import type { Locale } from "@/app/i18n/messages";

export type GuideSection = {
  title: string;
  intro?: string;
  items?: string[];
  groups?: { title: string; items: string[] }[];
  steps?: { title: string; lines: string[] }[];
};

export type AboutGuide = {
  systemName: string;
  heading: string;
  intro: string;
  sections: GuideSection[];
};

const EN: AboutGuide = {
  systemName: "Immigration Central Registration and Citizenship System (ICRCS)",
  heading: "Applicant Guide",
  intro:
    "The Immigration Central Registration and Citizenship System (ICRCS) is an electronic system developed by the Immigration Department to register and determine the immigration status of everyone living in the country. It lets a person submit their personal details, key documents and biometric data for assessment and a decision on their immigration status.",
  sections: [
    {
      title: "Why Must I Use This System?",
      intro: "You are required to use this system so the Government can:",
      items: [
        "Identify everyone living in the country.",
        "Verify your identity.",
        "Determine your immigration status.",
        "Improve the delivery of government services.",
        "Strengthen national security.",
        "Keep accurate immigration records.",
      ],
    },
    {
      title: "Who Must Register?",
      intro: "Those required to register are:",
      items: [
        "Citizens.",
        "Foreigners.",
        "Residents.",
        "Refugees.",
        "Asylum seekers.",
        "Migrants.",
        "Stateless persons.",
      ],
    },
    {
      title: "Steps to Follow",
      steps: [
        {
          title: "Step 1: Create an Account",
          lines: [
            'Select "Create Profile".',
            "Enter your names along with your email address and phone number.",
            "Create a password.",
            "Verify your account using the OTP sent to your email.",
          ],
        },
        {
          title: "Step 2: Log In",
          lines: ["Use the email and password you registered with to log in to the system."],
        },
        {
          title: "Step 3: Fill in Personal Information",
          lines: [
            "Fill in all required information accurately. Complete every section:",
            "Personal details",
            "Parents' details",
            "Emergency contacts",
            "Next of kin",
            "Family (spouse and children)",
            "Education and employment",
          ],
        },
        {
          title: "Step 4: Submit Your Application",
          lines: ["After completing the form, submit your application."],
        },
        {
          title: "Step 5: Receive a Unique Identification Number",
          lines: ["The system will generate a unique number to track your application."],
        },
        {
          title: "Step 6: Attend for Biometrics",
          lines: [
            "You will be notified to visit an Immigration Office for fingerprint and photo capture.",
          ],
        },
        {
          title: "Step 7: Assessment and Status Decision",
          lines: ["Your application will be reviewed and your immigration status decided."],
        },
      ],
    },
    {
      title: "Required Documents",
      intro: "Applicants should prepare the following documents where applicable:",
      groups: [
        {
          title: "Identification Documents (Copies)",
          items: ["NIDA national ID", "Travel document (Passport)", "Birth certificate"],
        },
        {
          title: "Family Documents",
          items: [
            "Parent's birth certificate",
            "Parent's NIDA number",
            "Marriage certificate",
            "Children's birth certificates",
          ],
        },
        {
          title: "Supporting Documents",
          items: ["Any document that can establish your immigration status"],
        },
      ],
    },
    {
      title: "Important Notice",
      intro:
        "Providing false information is an offence and may lead to your application being rejected or to legal action.",
    },
    {
      title: "Track Your Application",
      intro: "You can track your application using your Application Number.",
    },
    {
      title: "Contact",
      intro:
        "For further assistance, contact the Immigration Department through the official communication channels.",
    },
  ],
};

const SW: AboutGuide = {
  systemName: "Immigration Central Registration and Citizenship System (ICRCS)",
  heading: "Mwongozo kwa Mwombaji",
  intro:
    "Mfumo Jumuishi wa Usajili na Uraia wa Uhamiaji (ICRCS) ni mfumo wa kielektroniki ulioundwa na Idara ya Uhamiaji kwa ajili ya kusajili na kubaini hadhi ya uhamiaji ya watu wote wanaoishi nchini. Mfumo huu unamwezesha mtu kuwasilisha taarifa zake binafsi, nyaraka muhimu na taarifa za biometriki kwa ajili ya tathmini na uamuzi wa hadhi yake ya kiuhamiaji.",
  sections: [
    {
      title: "Kwa Nini Natakiwa Kutumia Mfumo Huu?",
      intro: "Unatakiwa kutumia mfumo huu ili Serikali iweze:",
      items: [
        "Kuwatambua watu wote wanaoishi nchini.",
        "Kuthibitisha utambulisho wako.",
        "Kubaini hadhi yako ya uhamiaji.",
        "Kuboresha utoaji wa huduma za serikali.",
        "Kuimarisha usalama wa taifa.",
        "Kutunza kumbukumbu sahihi za kiuhamiaji.",
      ],
    },
    {
      title: "Nani Anatakiwa Kujisajili?",
      intro: "Watu wanaotakiwa kujisajili ni:",
      items: [
        "Raia.",
        "Wageni.",
        "Wakazi.",
        "Wakimbizi.",
        "Waomba Hifadhi.",
        "Wahamiaji.",
        "Watu wasio na uraia.",
      ],
    },
    {
      title: "Hatua za Kufuata",
      steps: [
        {
          title: "Hatua ya 1: Fungua Akaunti",
          lines: [
            'Chagua "Tengeneza Wasifu".',
            "Ingiza taarifa zako za majina pamoja na anwani yako ya barua pepe na nambari ya simu.",
            "Unda nenosiri.",
            "Thibitisha akaunti yako kwa kutumia OTP iliyotumwa kwenye barua pepe yako.",
          ],
        },
        {
          title: "Hatua ya 2: Ingia Kwenye Mfumo",
          lines: ["Tumia barua pepe na nenosiri ulilosajili nalo kuingia kwenye mfumo."],
        },
        {
          title: "Hatua ya 3: Jaza Taarifa Binafsi",
          lines: [
            "Jaza taarifa zote zinazohitajika kwa usahihi. Kamilisha vipengele vyote:",
            "Taarifa binafsi",
            "Taarifa za Wazazi",
            "Taarifa za watu wa dharura",
            "Taarifa za Ndugu wa karibu",
            "Taarifa za Familia (Mke/mume na watoto)",
            "Taarifa za Elimu na ajira",
          ],
        },
        {
          title: "Hatua ya 4: Wasilisha Maombi",
          lines: ["Baada ya kukamilisha fomu, wasilisha maombi yako."],
        },
        {
          title: "Hatua ya 5: Pokea Namba Maalum ya Utambulisho",
          lines: ["Mfumo utazalisha namba ya kipekee kwa matumizi ya kufuatilia maombi yako."],
        },
        {
          title: "Hatua ya 6: Fika Kwa Ajili ya Biometriki",
          lines: [
            "Utapokea taarifa ya kufika Ofisi ya Uhamiaji kwa ajili ya uchukuaji wa alama za vidole na picha.",
          ],
        },
        {
          title: "Hatua ya 7: Tathmini na Uamuzi wa Hadhi",
          lines: ["Maombi yako yatapitiwa na hadhi yako ya uhamiaji itaamuliwa."],
        },
      ],
    },
    {
      title: "Nyaraka Muhimu Zinazotakiwa",
      intro: "Waombaji wanatakiwa kuandaa nyaraka zifuatazo pale zinapohusika:",
      groups: [
        {
          title: "Nyaraka za Utambulisho (Nakala)",
          items: ["Kitambulisho cha NIDA", "Hati ya kusafiria (Pasipoti)", "Cheti cha kuzaliwa"],
        },
        {
          title: "Nyaraka za Familia",
          items: [
            "Cheti cha kuzaliwa mzazi",
            "Namba ya NIDA ya mzazi",
            "Cheti cha Ndoa",
            "Vyeti vya Kuzaliwa Watoto",
          ],
        },
        {
          title: "Nyaraka za Kusaidia Maombi",
          items: ["Nyaraka yeyote inayoweza kutambua hadhi yako ya kiuhamiaji"],
        },
      ],
    },
    {
      title: "Taarifa Muhimu",
      intro:
        "Kutoa taarifa za uongo ni kosa na kunaweza kusababisha maombi yako kukataliwa au kuchukuliwa hatua za kisheria.",
    },
    {
      title: "Fuatilia Maombi Yako",
      intro: "Unaweza kufuatilia maombi yako kwa kutumia Namba ya Maombi.",
    },
    {
      title: "Mawasiliano",
      intro:
        "Kwa msaada zaidi, wasiliana na Idara ya Uhamiaji kupitia njia rasmi za mawasiliano.",
    },
  ],
};

export const ABOUT_GUIDE: Record<Locale, AboutGuide> = { en: EN, sw: SW };
