export type Locale = "en" | "sw";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "sw", label: "Swahili" },
];

export const DEFAULT_LOCALE: Locale = "en";

const en = {
  brand: {
    country: "The United Republic of Tanzania",
    system: "Immigration Central Registration and Citizenship System",
    department: "Immigration Services Department",
    ministry: "Ministry of Home Affairs",
    servicesDepartment: "Immigration Services Department",
  },
  hero: {
    badge: "ISO Certified · 24/7 Secure Access",
    title: "Sovereign Access",
    subtitle:
      "Access the Immigration Central Registration and Citizenship System. Your gateway to national immigration services.",
  },
  status: {
    heading: "Security: Status Check",
    label: "Verify ID activity without login",
    placeholder: "TZN-000-000",
    verify: "Verify status",
    hint: "For more information visit a nearest immigration office.",
    incomplete: "Your registration is not yet complete.",
    atStage: "Current step",
    nextStage: "Next step to complete",
    notStarted: "Not started",
  },
  form: {
    title: "Sign In",
    subtitle: "Welcome back! Please enter your credentials",
    email: "Email",
    emailPlaceholder: "example@portal.go.tz",
    password: "Password",
    forgot: "Forgot Password?",
    emailInvalid: "Please enter a valid email address",
    passwordRequired: "Please enter your password",
    loginFailed: "Invalid email or password.",
    signIn: "Sign In",
    signingIn: "Signing in…",
    noAccount: "Don't have an account?",
    register: "Create profile",
    showPassword: "Show password",
    hidePassword: "Hide password",
  },
  register: {
    title: "Create Profile",
    subtitle: "Create your profile for sovereign access to national services",
    next: "Next",
    firstName: "First name",
    middleName: "Middle name",
    lastName: "Last name",
    gender: "Gender",
    genderSelect: "Select gender",
    genderMale: "Male",
    genderFemale: "Female",
    genderOther: "Other",
    phone: "Phone number",
    phonePlaceholder: "+255 712 345 678",
    passwordHint: "At least 8 characters, with upper, lower & a number.",
    submit: "Create Account",
    submitting: "Creating account…",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
    optional: "optional",
    required: "This field is required.",
    error: "Registration failed. Please check your details and try again.",
  },
  otp: {
    title: "Enter Verification Code sent to your email",
    expires: "Code Expires in",
    expired: "Verification code expired",
    resend: "Resend code",
    next: "Next",
    invalid: "Please enter the full 6-digit code",
    agree: "By creating an account, you agree to our",
    terms: "Terms of Service",
    and: "and",
    privacy: "Privacy Policy",
    haveAccount: "Already have an account?",
    login: "Login here",
    verifyFailed: "Invalid or expired verification code. Please try again.",
  },
  password: {
    title: "Create Password",
    subtitle: "Set a strong password to secure your account",
    password: "Password",
    confirm: "Confirm Password",
    requirements: "Requirements",
    reqMin: "Minimum 8 characters",
    reqCapital: "Atleast one capital letter",
    reqSpecial: "Atleast one special character",
    reqMatch: "Passwords match",
    mismatch: "Passwords do not match",
    cancel: "Cancel",
    complete: "Complete Registration",
    completing: "Completing…",
  },
  legal: {
    close: "Close",
    termsTitle: "Terms of Service",
    termsBody:
      "By registering for the Integrated Citizen Registry and Control System (ICRCS), you agree to use the portal solely for lawful immigration and citizen-registry purposes.\n\nYou confirm that all information you provide is true, accurate, and complete. Providing false information constitutes a criminal offence under the National Security and Digital Identity Act.\n\nYour account is personal and non-transferable. You are responsible for safeguarding your credentials and for all activity conducted under your Authorization ID.\n\nThe Tanzania Immigration Services Department may suspend or revoke access where misuse, fraud, or a security risk is identified.",
    privacyTitle: "Privacy Policy",
    privacyBody:
      "Your data is processed by the Tanzania Immigration Services Department (TISD) in accordance with the Electronic and Postal Communications Act and the Cybercrimes Act.\n\nAll personal data is encrypted at rest and in transit (AES-256 / TLS 1.3) and is linked exclusively to Tanzania's sovereign national registry.\n\nData is cross-validated against NIDA, RITA, and biometric systems strictly for identity verification. Every access to your record is permanently logged with officer ID, timestamp, and sector.\n\nWe do not sell or share your data with third parties except as required by Tanzanian law.",
  },
  nav: {
    dashboard: "Dashboard",
    registry: "Citizen Registry",
    people: "Registered People",
    visa: "Visa Processing",
    security: "Security Audit",
    logout: "Logout",
  },
  people: {
    title: "Registered People",
    subtitle: "Everyone registered under your account.",
    empty: "No one has been registered yet.",
    startCta: "Start a registration",
    clear: "Clear all",
    creatorBadge: "Account Holder",
    submittedOn: "Submitted on {date}",
    download: "Download PDF",
    loadError: "Could not load registered people. Please refresh or try again later.",
  },
  dashboard: {
    badge: "Action Required: Legal Compliance",
    title: "Secure Your National Identity",
    welcome:
      "Welcome, {name}. Your profile in the Integrated Citizen Registry is currently inactive. Mandatory registration is required to ensure your data sovereignty and access to essential government services.",
    startRegistration: "Start Registration",
    viewRequirements: "View Requirements",
    currentStatus: "Current Status",
    statusPending: "Registration Pending",
    checklistTitle: "Preparation Checklist",
    checklistSubtitle: "Ensure you have these ready before starting",
    downloadGuide: "Download Guide PDF",
    nidaTitle: "National ID (NIDA)",
    nidaDesc: "Valid National Identification Authority card or number confirmation.",
    birthTitle: "Birth Certificate",
    birthDesc: "Verified copy of your national birth registration number.",
    addressTitle: "Proof of Address",
    addressDesc: "Valid utility bill or local authority residency letter.",
    keyTitle: "Secure Key",
    keyDesc: "The physical security key issued during pre-clearance.",
    
  },
  registry: {
    saveExit: "Save & Exit",
    next: "Save",
    complete: "Complete Registration",
    required: "Please fill in all required fields to continue.",
    ageError: "The account holder must be at least 18 years old.",
    minorError: "Dependents registered under your profile must be under 18 years old.",
    futureDateError: "The date of birth cannot be in the future.",
    submitError: "Could not submit this step. Please try again.",
    attachHint: "Tick a document, then upload it (JPG, PNG or PDF).",
    attachChoose: "Choose file",
    attachPhotoRequired: "Please upload the required Passport Size Photo before continuing.",
    photoUploadRetry: "Photo upload failed due to a network connection issue. Please click Next to retry.",
    photoMissing: "Your passport photo is missing. Please go back to Personal Information to add it.",
    attachIdRequired: "At least one identification document is required for adults.",
    nidaRequired: "Please enter the National ID (NIDA) number for adults.",
    schoolRequired: "Please add at least one school, or tick “I never attended school”.",
    spouseRequired: "Please provide details for at least one spouse.",
    attachAdd: "Add document",
    attachPreview: "Preview",
    attachRemove: "Remove",
    attachEmpty: "No documents uploaded yet.",
    attachOnlyPdf: "Only PDF files are allowed.",
    attachListTitle: "Uploaded documents",
    previewEdit: "Edit",
    previewLoading: "Loading your application summary…",
    previewLoadError: "Could not load your application summary. Please try again.",
    sameAsPerm: "My current address is the same as my permanent address",
    neverAttendedSchool: "I have never attended school",
    back1: "Back",
    back2: "Back to Personal Info",
    back3: "Back to Address",
    back4: "Back to Parents Info",
    back5: "Back to Education",
    back6: "Back to Emergency Contacts",
    back7: "Back to Family",
    back8: "Back to Referees",
    back9: "Back to Uploads",
    s1Title: "Personal Information",
    s1Desc: "Name, date of birth, citizenship and contact details",
    s2Title: "Address",
    s2Desc: "Current and permanent address",
    s3Title: "Parents Information",
    s3Desc: "Father and mother details",
    s4Title: "Education & Employment",
    s4Desc: "Education history and current employment",
    s5Title: "Emergency Contacts",
    s5Desc: "People to contact in case of emergency",
    s6Title: "Family",
    s6Desc: "Children, spouse, and relatives",
    s7Title: "Referees",
    s7Desc: "Referees for your application (print only)",
    s8Title: "Uploads",
    s8Desc: "Upload supporting documents",
    s9Title: "Preview & Declaration",
    s9Desc: "Review your information and confirm",
    s1Tag: "Step 01 - Personal Information",
    s1Heading: "Personal Information",
    s1Intro:
      "To initiate your national digital identity, please create your profile. This information will be encrypted and securely linked to your national registry.",
    s2Tag: "Step 02 - Address",
    s2Heading: "Current & Permanent Address",
    s2Intro:
      "Provide your current and permanent address details. If they are the same, you only need to fill in one.",
    s3Tag: "Step 03 - Parents",
    s3Heading: "Parents Information",
    s3Intro:
      "Provide the details of your father and mother. This data will be securely encrypted and linked to your national identification.",
    s4Tag: "Step 04 - Education & Employment",
    s4Heading: "Education and Employment",
    s4Intro:
      "Provide details of your educational background and current employment. All information will be encrypted and securely linked to your national identification.",
    s5Tag: "Step 05 - Emergency Contacts",
    s5Heading: "Emergency Contacts",
    s5Intro:
      "Provide at least two emergency contacts with their full details. These individuals may be contacted in urgent situations.",
    s6Tag: "Step 06 - Family",
    s6Heading: "Family Information",
    s6Intro:
      "Provide information about your family — children, spouse, and close relatives.",
    s7Tag: "Step 07 - Referees",
    s7Heading: "Referees",
    s7Intro:
      "Referees are individuals who can vouch for your identity and character. This section is for print purposes only.",
    s8Tag: "Step 08 - Uploads",
    s8Heading: "Document Uploads",
    s8Intro:
      "Upload supporting documents such as your birth certificate or national ID copy. You can preview and remove documents before submitting.",
    s9Tag: "Step 09 - Preview & Declaration",
    s9Heading: "Preview and Declaration",
    s9Intro:
      "Review all the information you provided. You can go back to any step to correct a mistake, then confirm the declaration to submit. Providing false information is a criminal offense under Tanzanian law.",
    refereesTitle: "Referees",
    refereesInfo: "Referees are assigned by the registration office and will appear on your printed application form. You do not need to enter any information here.",
    refereesNote: "This section is managed by the registration office. Simply proceed to the next step.",
    refereesDownload: "Download and Print Referees Form",
    refereesDownloading: "Preparing form…",
    refereesDownloadError: "Could not load the referees form. Please try again.",
    tipTitle: "Helpful Tip",
    tipBody:
      "If you cannot find your specific Ward, please select the nearest administrative area or contact the Ministry of Home Affairs helpline at +255-26-2323189.",
    clauseTitle: "Official Clause",
    clauseText:
      "I, {name}, hereby declare that all information provided in this registration form is true, complete, and accurate to the best of my knowledge. I understand that any false statements or omission of material facts may result in the rejection of my application or criminal prosecution under the National Security and Digital Identity Act.",
    agree: "I agree to the terms and conditions and the legal declaration above.",
    landingTitle: "Citizen Registry",
    landingTitleAccent: "Tanzania",
    landingIntro:
      "This service lets you complete the Citizen Registry application form electronically from anywhere. After filling in the form, you will need to visit the nearest Immigration Office with your supporting documents to finalize your application.",
    startTitle: "Start Registration",
    startDesc:
      "Begin a new Citizen Registry application and fill in your details electronically.",
    startAction: "Start application",
    startOwnerTitle: "Register Yourself",
    startOwnerDesc:
      "As the profile owner, complete your own registration first — before anyone else can be added.",
    startDependentTitle: "Register a Dependent",
    startDependentDesc:
      "Add a dependent (under 18) under your profile.",
    finishFirstNote: "Finish your in-progress registration before starting a new one.",
    nothingToResume: "No registration in progress.",
    resumeTitle: "Resume Registration",
    resumeDesc:
      "Continue an application you started earlier and pick up where you left off to receive your Application Number.",
    resumeAction: "Resume application",
    statusTitle: "Registration Status",
    statusDesc:
      "Track the progress of your submitted application and view the status of your Registration Certificate.",
    statusAction: "View status",
    submittedTitle: "Registration Submitted!",
    applicationId: "Application ID",
    submittedOn: "Submitted on {date} — Keep this ID for follow-up queries.",
    submittedHelp:
      "Download and print your application form, then present the printed copy at your nearest immigration office for further processing.",
    downloadPdf: "Download PDF",
    printForm: "Print Form",
    returnDashboard: "Return to Dashboard",
    checkTitle: "Check Application Status",
    checkIntro:
      "Enter your Application ID to view the current status and progress of your Citizen Registry application.",
    checkIdLabel: "Application ID",
    checkButton: "Check Status",
    checkInvalid: "Please enter a valid Application ID (e.g. CREG260604812345).",
    checkResultTitle: "Application Status",
    checkCurrent: "Current Status",
    checking: "Checking…",
    checkFailed: "Unable to retrieve application status. Please try again.",
    checkNotFoundBadge: "Not Found",
    stage1: "Submitted",
    stage2: "Enrolled",
    stage3: "Assessed",
    stage4: "Approved",
    stage5: "Status Issued",
    statusIncompleteBadge: "Incomplete",
    statusEmailVerified: "Email verified",
    statusActive: "Active",
    statusCreatedAt: "Created",
    statusUpdatedAt: "Updated",
    yes: "Yes",
    no: "No",
    status_PENDING: "Pending",
    status_PENDING_ASSESSMENT: "Pending assessment",
    status_SUBMITTED: "Submitted",
    status_APPROVED: "Approved",
    status_REJECTED: "Rejected",
    status_IN_REVIEW: "Under review",
    statusIncompleteMsg:
      "You have not completed filling your registration forms. Please complete the form below before continuing.",
    statusNextStep: "Next form to complete",
    statusFormProgress: "Form Progress",
    statusContinue: "Continue Registration",
    idDialogTitle: "Application ID Created",
    idDialogEmailed: "We've emailed a copy to {email}.",
    idDialogHelp:
      "Keep this ID safe. You can check your registration status anytime using it — even before you finish all the forms.",
    idDialogContinue: "Continue",
    statusLoginPrompt: "Please sign in to continue your registration.",
  },
  forgot: {
    title: "Reset Password",
    subtitle: "Enter your email or phone to receive a reset code.",
    identifier: "Email or phone",
    identifierPlaceholder: "example@portal.go.tz",
    identifierRequired: "Please enter your email or phone.",
    sendCode: "Send reset code",
    sending: "Sending…",
    otpTitle: "Enter the reset code sent to your email",
    otpSentTo: "Enter the 6-digit code we sent to",
    noCode: "Didn't get the code?",
    resend: "Resend code",
    resending: "Resending…",
    resendIn: "Resend in {seconds}s",
    resent: "A new code has been sent.",
    verify: "Verify code",
    verifying: "Verifying…",
    newPassword: "New Password",
    confirm: "Confirm Password",
    reset: "Reset Password",
    resetting: "Resetting…",
    successTitle: "Password reset",
    successMsg: "Your password has been reset. You can now sign in.",
    backToLogin: "Back to sign in",
    error: "Something went wrong. Please try again.",
  },
  promo: {
    title: "A Modern, Welcoming Tanzania",
    subtitle:
      "Safe borders, dignified service, and seamless travel — immigration that connects citizens and visitors to a thriving nation.",
    capIdentity: "United",
    capRegistry: "Modern",
    capBorder: "Welcoming",
  },
  profile: {
    title: "My Profile",
    subtitle: "View and update your account details and photo.",
    changePhoto: "Change photo",
    removePhoto: "Remove photo",
    uploading: "Uploading…",
    removing: "Removing…",
    photoHint: "JPG or PNG, up to 500KB.",
    photoInvalidType: "Please choose a JPG or PNG image.",
    photoTooLarge: "Image must be 500KB or smaller.",
    photoUpdated: "Profile photo updated.",
    photoRemoved: "Profile photo removed.",
    photoError: "Could not update the photo. Please try again.",
    save: "Save changes",
    saving: "Saving…",
    saved: "Profile updated.",
    updateError: "Could not update your profile. Please try again.",
  },
  infoCards: {
    eyebrow: "Why ICRCS",
    identityTitle: "One National Identity",
    identityBody:
      "A single, verified identity for every citizen and resident — no duplicate records, no fraud.",
    registryTitle: "Unified Citizen Registry",
    registryBody:
      "Births, residence, and civil status held in one secure national database, available across agencies.",
    biometricTitle: "Biometric Verification",
    biometricBody:
      "Fingerprint and facial capture link your identity to you alone, protecting against impersonation.",
    borderTitle: "Secure Border Control",
    borderBody:
      "Real-time checks at every airport and crossing keep Tanzania's borders safe and efficient.",
    passportTitle: "e-Passports & Travel Documents",
    passportBody:
      "Apply for and renew chip-enabled EAC passports and travel papers without queueing at an office.",
    statusTitle: "24/7 Status Tracking",
    statusBody:
      "Follow every application from submission to approval, anytime, with your authorization ID.",
  },
  idle: {
    title: "Session Timeout Warning",
    subtitle: "You have been inactive",
    message:
      "You have been inactive for 30 minutes. For your security, you will be automatically logged out when the countdown expires.",
    autoLogout: "Auto-logout when timer reaches 0:00",
    logoutNow: "Logout Now",
    stayLoggedIn: "Stay Logged In",
  },
  // RECONSTRUCTED after accidental loss of uncommitted work. Keys are exact
  // (derived from every t("fields.*") usage in the codebase). Values marked
  // `// REVIEW` were reconstructed and need checking; the rest are recovered.
  fields: {
    // --- recovered exact values ---
    phVillageStreet: "Village / Street",
    phHouseStreet: "House Number / Street",
    phCity: "City",
    phPostal: "Postal Code",
    phRegion: "Region",
    phDistrict: "District",
    phWard: "Ward",
    phMtaa: "Street / Mtaa",
    phTerritory: "Territory",
    phSelectTerritoryFirst: "Select territory first",
    phSelectCountryFirst: "Select country first",
    phSelectRegionFirst: "Select region first",
    phSelectDistrictFirst: "Select district first",
    phSelectWardFirst: "Select ward first",
    phLoadingWards: "Loading wards…",
    phLoadingStreets: "Loading streets…",
    phNoWards: "No wards available yet",
    phNoStreets: "No streets available yet",
    phSearchCountry: "Search country…",
    phNoMatch: "No match",
    openCalendar: "Open calendar",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    selectMonth: "Select month",
    selectYear: "Select year",
    chooseFile: "Choose File",
    noFile: "No file chosen",
    uploading: "Uploading…",
    // --- reconstructed values (verify) ---
    firstName: "First Name", // REVIEW
    middleName: "Middle Name", // REVIEW
    lastName: "Last Name", // REVIEW
    fullName: "Full Name", // REVIEW
    gender: "Gender", // REVIEW
    dob: "Date of Birth", // REVIEW
    email: "Email", // REVIEW
    phone: "Phone Number", // REVIEW
    nationality: "Nationality", // REVIEW
    marriage: "Marital Status", // REVIEW
    married: "Are you married?", // REVIEW
    occupation: "Occupation", // REVIEW
    occupationOpt: "Occupation (optional)", // REVIEW
    relationship: "Relationship", // REVIEW
    residence: "Residence", // REVIEW
    placeOfBirth: "Place of Birth", // REVIEW
    placeOfBirthRdw: "Place of Birth (Region / District / Ward)", // REVIEW
    curAddress: "Current Address", // REVIEW
    permAddress: "Permanent Address", // REVIEW
    citizenQuestion: "Are you a Tanzanian citizen?", // REVIEW
    citizenYes: "Yes", // REVIEW
    citizenNo: "No", // REVIEW
    nidaNumber: "NIDA Number", // REVIEW
    birthCertNo: "Birth Certificate Number", // REVIEW
    birthCertFile: "Birth Certificate (upload)",
    indexNo: "Index Number", // REVIEW
    docType: "Document Type", // REVIEW
    docNumber: "Document Number", // REVIEW
    docNumberReq: "Document number is required", // REVIEW
    docFile: "Document File", // REVIEW
    eduLevel: "Education Level", // REVIEW
    schoolName: "School Name", // REVIEW
    schoolDistrict: "School District", // REVIEW
    completionYear: "Completion Year", // REVIEW
    employment: "Employment", // REVIEW
    employmentStatus: "Employment Status", // REVIEW
    employmentStatusOpt: "Employment Status", // REVIEW
    employer: "Employer", // REVIEW
    employerOpt: "Employer (optional)", // REVIEW
    fatherInfo: "Father's Information", // REVIEW
    motherInfo: "Mother's Information", // REVIEW
    haveChildren: "Do you have children?", // REVIEW
    childrenNote: "Add each child registered under your profile.", // REVIEW
    relativesTitle: "Relatives", // REVIEW
    relativesNote: "Add close relatives.", // REVIEW
    relativeN: "Relative", // REVIEW
    spouseN: "Spouse", // REVIEW
    spouseNote: "Add your spouse's details.", // REVIEW
    schoolN: "School", // REVIEW
    schoolNote: "Add each school attended.", // REVIEW
    emergencyContactN: "Emergency Contact", // REVIEW
    addRelative: "Add Relative", // REVIEW
    addSpouse: "Add Spouse", // REVIEW
    addSchool: "Add School", // REVIEW
    remove: "Remove", // REVIEW
    required: "Required", // REVIEW
    photo: "Photo", // REVIEW
    photoHint: "Upload a passport-size photo (JPG or PNG).", // REVIEW
    photoSizeError: "Photo is too large.", // REVIEW
    photoTypeError: "Invalid photo type.", // REVIEW
    uploadPhoto: "Upload Photo", // REVIEW
    changePhoto: "Change Photo", // REVIEW
    uploaded: "Uploaded", // REVIEW
    uploadFailed: "Upload failed", // REVIEW
    uploadsNeedId: "At least one identification document is required.", // REVIEW
    phFirst: "First name", // REVIEW
    phMiddle: "Middle name", // REVIEW
    phLast: "Last name", // REVIEW
    phFirstName: "Enter first name", // REVIEW
    phMiddleName: "Enter middle name", // REVIEW
    phLastName: "Enter last name", // REVIEW
    phCountry: "Country", // REVIEW
    phCountryNat: "Country of nationality", // REVIEW
    phCityVillageBirth: "City / Village of birth", // REVIEW
    phCityOpt: "City", // REVIEW
    phVillage: "Village", // REVIEW
    phStreet: "Street", // REVIEW
    phDocNumber: "Enter document number", // REVIEW
    phSelect: "Select", // REVIEW
    phSelectGender: "Select gender", // REVIEW
    phSelectStatus: "Select status", // REVIEW
    phSelectType: "Select type", // REVIEW
    phSelectLevel: "Select level", // REVIEW
    phSelectOccupation: "Select occupation", // REVIEW
    phSelectRelationship: "Select relationship", // REVIEW
  },
  // RECONSTRUCTED. opt.* values are derived from blocks.tsx / MOCK_* (reliable
  // English). gate.* and preview.* were reconstructed — verify `// REVIEW`.
  opt: {
    male: "Male",
    female: "Female",
    other: "Other",
    single: "Single",
    married: "Married",
    divorced: "Divorced",
    widowed: "Widowed",
    employed: "Employed",
    selfEmployed: "Self-employed",
    unemployed: "Unemployed",
    student: "Student",
    retired: "Retired",
    citBirth: "Birth",
    citDescent: "Descent",
    citNaturalization: "Naturalization",
    relParent: "Parent",
    relSibling: "Sibling",
    relSpouse: "Spouse",
    relChild: "Child",
    relRelative: "Relative",
    relGuardian: "Guardian",
    relFriend: "Friend",
    relOther: "Other",
    occGovernment: "Government Employee",
    occPrivate: "Private Sector",
    occSelfEmployed: "Self-employed",
    occFarmer: "Farmer",
    occStudent: "Student",
    occRetired: "Retired",
    occUnemployed: "Unemployed",
    occOther: "Other",
    occBusiness: "Business",
    docNida: "National ID (NIDA)",
    docPassport: "Passport",
    docDriving: "Driving License",
    docVoter: "Voter ID",
  },
  gate: {
    title: "Citizenship Check", // REVIEW
    intro: "Confirm your citizenship status to begin registration.", // REVIEW
    travelDocType: "Travel Document Type", // REVIEW
    verifying: "Verifying…", // REVIEW
    notFoundTitle: "Record Not Found", // REVIEW
    notFoundBody: "We could not find a matching record. Please check your details and try again.", // REVIEW
    back: "Back", // REVIEW
    continue: "Continue", // REVIEW
    submit: "Submit", // REVIEW
  },
  preview: {
    fullName: "Full Name", // REVIEW
    gender: "Gender", // REVIEW
    dob: "Date of Birth", // REVIEW
    phone: "Phone Number", // REVIEW
    email: "Email", // REVIEW
    nationality: "Nationality", // REVIEW
    maritalStatus: "Marital Status", // REVIEW
    currentlyMarried: "Currently Married", // REVIEW
    placeOfBirth: "Place of Birth", // REVIEW
    countryOfBirth: "Country of Birth", // REVIEW
    nida: "NIDA Number", // REVIEW
    birthCertNo: "Birth Certificate No.", // REVIEW
    index: "Index Number", // REVIEW
    naturalization: "Naturalization", // REVIEW
    certNo: "Certificate Number", // REVIEW
    issuePlace: "Issue Place", // REVIEW
    issueDate: "Issue Date", // REVIEW
    residence: "Residence", // REVIEW
    currentAddress: "Current Address", // REVIEW
    permanentAddress: "Permanent Address", // REVIEW
    region: "Region", // REVIEW
    district: "District", // REVIEW
    ward: "Ward", // REVIEW
    village: "Village", // REVIEW
    villageStreet: "Village / Street", // REVIEW
    postalCode: "Postal Code", // REVIEW
    father: "Father", // REVIEW
    mother: "Mother", // REVIEW
    hasChildren: "Has Children", // REVIEW
    relationship: "Relationship", // REVIEW
    education: "Education", // REVIEW
    level: "Level", // REVIEW
    employment: "Employment", // REVIEW
    employmentStatus: "Employment Status", // REVIEW
    employer: "Employer", // REVIEW
    occupation: "Occupation", // REVIEW
    document: "Document", // REVIEW
    documents: "Documents", // REVIEW
  },
  // Attachment labels, keyed attach.a{attachmentTypeId} (see ATTACHMENT_TYPES
  // in lib/api/files.ts). English values mirror those labels.
  attach: {
    a1: "Birth Certificate Copy",
    a2: "ID Copy (NIDA / Passport)",
    a4: "WEO / VEO Letter",
    a5: "Passport Size Photo",
    a6: "Academic Certificate",
    a7: "Voters ID Copy",
    a8: "Passport Bio Page",
  },
  footer: "© 2026 The United Republic of Tanzania | Immigration Department",
};

const sw: typeof en = {
  brand: {
    country: "Jamhuri ya Muungano wa Tanzania",
    system: "Mfumo Jumuishi wa Usajili na Udhibiti wa Raia",
    department: "Idara ya Uhamiaji",
    ministry: "Wizara ya Mambo ya Ndani ya Nchi",
    servicesDepartment: "Idara ya Uhamiaji",
  },
  hero: {
    badge: "Imethibitishwa na ISO · Ufikiaji Salama 24/7",
    title: "Ufikiaji wa Kitaifa",
    subtitle:
      "Fikia Mfumo Jumuishi wa Usajili na Udhibiti wa Raia. Lango lako kwa huduma za uhamiaji za kitaifa.",
  },
  status: {
    heading: "Usalama: Ukaguzi wa Hali",
    label: "Thibitisha shughuli za kitambulisho bila kuingia",
    placeholder: "TZN-000-000",
    verify: "Thibitisha hali",
    hint: "Kwa maelezo zaidi tembelea ofisi ya uhamiaji iliyo karibu nawe.",
    incomplete: "Usajili wako haujakamilika bado.",
    atStage: "Hatua ya sasa",
    nextStage: "Hatua inayofuata kukamilisha",
    notStarted: "Haijaanza",
  },
  form: {
    title: "Ingia",
    subtitle: "Karibu tena! Tafadhali weka taarifa zako za kuingia",
    email: "Barua pepe",
    emailPlaceholder: "mfano@portal.go.tz",
    password: "Nenosiri",
    forgot: "Umesahau nenosiri?",
    emailInvalid: "Tafadhali weka anuani sahihi ya barua pepe",
    passwordRequired: "Tafadhali weka nenosiri lako",
    loginFailed: "Barua pepe au nenosiri si sahihi.",
    signIn: "Ingia",
    signingIn: "Inaingia…",
    noAccount: "Huna akaunti?",
    register: "Tengeneza wasifu",
    showPassword: "Onyesha nenosiri",
    hidePassword: "Ficha nenosiri",
  },
  register: {
    title: "Tengeneza Wasifu",
    subtitle: "Tengeneza wasifu wako upate ufikiaji wa huduma za kitaifa",
    next: "Endelea",
    firstName: "Jina la kwanza",
    middleName: "Jina la kati",
    lastName: "Jina la ukoo",
    gender: "Jinsia",
    genderSelect: "Chagua jinsia",
    genderMale: "Mwanaume",
    genderFemale: "Mwanamke",
    genderOther: "Nyingine",
    phone: "Namba ya simu",
    phonePlaceholder: "+255 712 345 678",
    passwordHint: "Angalau herufi 8, zenye herufi kubwa, ndogo na namba.",
    submit: "Fungua Akaunti",
    submitting: "Inafungua akaunti…",
    haveAccount: "Tayari una akaunti?",
    signIn: "Ingia",
    optional: "si lazima",
    required: "Sehemu hii inahitajika.",
    error: "Usajili umeshindwa. Tafadhali angalia taarifa zako na ujaribu tena.",
  },
  otp: {
    title: "Weka Msimbo wa Uthibitisho uliotumwa kwenye barua pepe yako",
    expires: "Msimbo utaisha baada ya",
    expired: "Msimbo wa uthibitisho umeisha muda",
    resend: "Tuma msimbo tena",
    next: "Endelea",
    invalid: "Tafadhali weka msimbo kamili wa tarakimu 6",
    agree: "Kwa kufungua akaunti, unakubali",
    terms: "Masharti ya Huduma",
    and: "na",
    privacy: "Sera ya Faragha",
    haveAccount: "Tayari una akaunti?",
    login: "Ingia hapa",
    verifyFailed: "Msimbo wa uthibitisho si sahihi au umeisha muda. Tafadhali jaribu tena.",
  },
  password: {
    title: "Tengeneza Nenosiri",
    subtitle: "Weka nenosiri imara kulinda akaunti yako",
    password: "Nenosiri",
    confirm: "Thibitisha Nenosiri",
    requirements: "Mahitaji",
    reqMin: "Angalau herufi 8",
    reqCapital: "Angalau herufi kubwa moja",
    reqSpecial: "Angalau alama maalum moja",
    reqMatch: "Manenosiri yanalingana",
    mismatch: "Manenosiri hayalingani",
    cancel: "Ghairi",
    complete: "Kamilisha Usajili",
    completing: "Inakamilisha…",
  },
  legal: {
    close: "Funga",
    termsTitle: "Masharti ya Huduma",
    termsBody:
      "Kwa kujisajili katika Mfumo Jumuishi wa Usajili na Udhibiti wa Raia (ICRCS), unakubali kutumia mfumo kwa madhumuni halali ya uhamiaji na usajili wa raia pekee.\n\nUnathibitisha kuwa taarifa zote unazotoa ni za kweli, sahihi na kamili. Kutoa taarifa za uongo ni kosa la jinai chini ya Sheria ya Usalama wa Taifa na Utambulisho wa Kidijitali.\n\nAkaunti yako ni ya binafsi na hairuhusiwi kuhamishiwa mtu mwingine. Una jukumu la kulinda taarifa zako za kuingia na shughuli zote zinazofanyika chini ya Kitambulisho chako.\n\nIdara ya Uhamiaji Tanzania inaweza kusimamisha au kufuta ufikiaji pale matumizi mabaya, udanganyifu au hatari ya kiusalama inapobainika.",
    privacyTitle: "Sera ya Faragha",
    privacyBody:
      "Taarifa zako zinashughulikiwa na Idara ya Uhamiaji Tanzania (TISD) kwa mujibu wa Sheria ya Mawasiliano ya Kielektroniki na Posta na Sheria ya Makosa ya Mtandao.\n\nTaarifa zote binafsi zimesimbwa wakati wa kuhifadhi na kusafirisha (AES-256 / TLS 1.3) na zimeunganishwa na daftari la kitaifa la Tanzania pekee.\n\nTaarifa zinahakikiwa dhidi ya NIDA, RITA na mifumo ya kibaiometriki kwa ajili ya uthibitisho wa utambulisho pekee. Kila ufikiaji wa kumbukumbu yako huhifadhiwa kwa kudumu na kitambulisho cha afisa, muda na sekta.\n\nHatuuzi wala kushiriki taarifa zako na watu wa tatu isipokuwa inapohitajika na sheria za Tanzania.",
  },
  nav: {
    dashboard: "Dashibodi",
    registry: "Daftari la Raia",
    people: "Watu Waliosajiliwa",
    visa: "Uchakataji wa Viza",
    security: "Ukaguzi wa Usalama",
    logout: "Toka",
  },
  people: {
    title: "Watu Waliosajiliwa",
    subtitle: "Kila mtu aliyesajiliwa chini ya akaunti yako.",
    empty: "Bado hakuna mtu aliyesajiliwa.",
    startCta: "Anza usajili",
    clear: "Futa zote",
    creatorBadge: "Mmiliki wa Akaunti",
    submittedOn: "Imewasilishwa tarehe {date}",
    download: "Pakua PDF",
    loadError: "Haikuweza kupakia watu waliojisajili. Tafadhali sasisha au jaribu tena baadaye.",
  },
  dashboard: {
    badge: "Hatua Inahitajika: Uzingatiaji wa Kisheria",
    title: "Linda Utambulisho Wako wa Kitaifa",
    welcome:
      "Karibu, {name}. Wasifu wako katika Daftari Jumuishi la Raia kwa sasa haujaamilishwa. Usajili wa lazima unahitajika kuhakikisha umiliki wa data yako na upatikanaji wa huduma muhimu za serikali.",
    startRegistration: "Anza Usajili",
    viewRequirements: "Angalia Mahitaji",
    currentStatus: "Hali ya Sasa",
    statusPending: "Usajili Unasubiri",
    checklistTitle: "Orodha ya Maandalizi",
    checklistSubtitle: "Hakikisha una vitu hivi tayari kabla ya kuanza",
    downloadGuide: "Pakua Mwongozo PDF",
    nidaTitle: "Kitambulisho cha Taifa (NIDA)",
    nidaDesc:
      "Kitambulisho cha Taifa (NIDA) au uthibitisho wa namba yako ya kuzaliwa.",
    birthTitle: "Cheti cha Kuzaliwa",
    birthDesc: "Nakala iliyothibitishwa ya namba yako ya usajili wa kuzaliwa.",
    addressTitle: "Uthibitisho wa Makazi",
    addressDesc: "Bili halali ya huduma au barua ya makazi kutoka mamlaka ya eneo.",
    keyTitle: "Ufunguo wa Usalama",
    keyDesc: "Ufunguo wa usalama wa kimwili uliotolewa wakati wa uhakiki wa awali.",
  },
  registry: {
    saveExit: "Hifadhi & Toka",
    next: "Hatua Inayofuata",
    complete: "Kamilisha Usajili",
    required: "Tafadhali jaza sehemu zote zinazohitajika ili kuendelea.",
    ageError: "Mmiliki wa akaunti lazima awe na umri wa angalau miaka 18.",
    minorError: "Wategemezi waliosajiliwa chini ya wasifu wako lazima wawe na umri chini ya miaka 18.",
    futureDateError: "Tarehe ya kuzaliwa haiwezi kuwa ya baadaye.",
    submitError: "Imeshindwa kuwasilisha hatua hii. Tafadhali jaribu tena.",
    attachHint: "Weka alama kwenye hati, kisha uipakie (JPG, PNG au PDF).",
    attachChoose: "Chagua faili",
    attachPhotoRequired: "Tafadhali pakia Picha ya Pasipoti inayohitajika kabla ya kuendelea.",
    photoUploadRetry: "Kupakia picha kumeshindikana kwa sababu ya tatizo la mtandao. Tafadhali bofya Endelea kujaribu tena.",
    photoMissing: "Picha yako ya pasipoti haipo. Tafadhali rudi kwenye Taarifa Binafsi kuiongeza.",
    attachIdRequired: "Angalau moja ya nyaraka za utambulisho inahitajika kwa watu wazima.",
    nidaRequired: "Tafadhali ingiza namba ya Kitambulisho cha Taifa (NIDA) kwa watu wazima.",
    schoolRequired: "Tafadhali ongeza angalau shule moja, au weka alama “Sikuwahi kuhudhuria shule”.",
    spouseRequired: "Tafadhali toa taarifa za angalau mwenzi mmoja wa ndoa.",
    attachAdd: "Ongeza nyaraka",
    attachPreview: "Angalia",
    attachRemove: "Ondoa",
    attachEmpty: "Bado hakuna nyaraka zilizopakiwa.",
    attachOnlyPdf: "Faili za PDF pekee zinaruhusiwa.",
    attachListTitle: "Nyaraka zilizopakiwa",
    previewEdit: "Hariri",
    previewLoading: "Inapakia muhtasari wa maombi yako…",
    previewLoadError: "Haikuweza kupakia muhtasari wa maombi yako. Tafadhali jaribu tena.",
    sameAsPerm: "Anwani yangu ya sasa ni sawa na anwani yangu ya kudumu",
    neverAttendedSchool: "Sijawahi kwenda shule",
    back1: "Rudi",
    back2: "Rudi kwenye Taarifa Binafsi",
    back3: "Rudi kwenye Anuani",
    back4: "Rudi kwenye Taarifa za Wazazi",
    back5: "Rudi kwenye Elimu",
    back6: "Rudi kwenye Watu wa Dharura",
    back7: "Rudi kwenye Familia",
    back8: "Rudi kwenye Wadhamini",
    back9: "Rudi kwenye Viambatisho",
    s1Title: "Taarifa Binafsi",
    s1Desc: "Jina, tarehe ya kuzaliwa, uraia na mawasiliano",
    s2Title: "Anuani",
    s2Desc: "Anuani ya sasa na ya kudumu",
    s3Title: "Taarifa za Wazazi",
    s3Desc: "Maelezo ya baba na mama",
    s4Title: "Elimu na Ajira",
    s4Desc: "Historia ya elimu na ajira ya sasa",
    s5Title: "Watu wa Dharura",
    s5Desc: "Watu wa kuwasiliana nao wakati wa dharura",
    s6Title: "Familia",
    s6Desc: "Watoto, mwenza, na ndugu",
    s7Title: "Wadhamini",
    s7Desc: "Wadhamini wa ombi lako (chapisha tu)",
    s8Title: "Viambatisho",
    s8Desc: "Pakia nyaraka za ushahidi",
    s9Title: "Hakiki na Tamko",
    s9Desc: "Hakiki taarifa zako na uthibitishe",
    s1Tag: "Hatua 01 - Taarifa Binafsi",
    s1Heading: "Taarifa Binafsi",
    s1Intro:
      "Ili kuanzisha utambulisho wako wa kidijitali wa kitaifa, tafadhali tengeneze wasifu wako. Taarifa hizi zitasimbwa na kuunganishwa kwa usalama na daftari lako la kitaifa.",
    s2Tag: "Hatua 02 - Anuani",
    s2Heading: "Anuani ya Sasa na ya Kudumu",
    s2Intro:
      "Toa anuani yako ya sasa na ya kudumu. Ikiwa zinafanana, unahitaji kujaza moja tu.",
    s3Tag: "Hatua 03 - Wazazi",
    s3Heading: "Taarifa za Wazazi",
    s3Intro:
      "Toa maelezo ya baba na mama yako. Data hii itasimbwa na kuunganishwa kwa usalama na utambulisho wako wa kitaifa.",
    s4Tag: "Hatua 04 - Elimu na Ajira",
    s4Heading: "Elimu na Ajira",
    s4Intro:
      "Toa maelezo ya historia yako ya kielimu na ajira yako ya sasa. Taarifa zote zitasimbwa na kuunganishwa kwa usalama na utambulisho wako wa kitaifa.",
    s5Tag: "Hatua 05 - Watu wa Dharura",
    s5Heading: "Watu wa Dharura",
    s5Intro:
      "Toa angalau watu wawili wa dharura na maelezo yao kamili. Watu hawa wanaweza kuwasiliana nao katika hali za dharura.",
    s6Tag: "Hatua 06 - Familia",
    s6Heading: "Taarifa za Familia",
    s6Intro:
      "Toa taarifa kuhusu familia yako — watoto, mwenza, na ndugu wa karibu.",
    s7Tag: "Hatua 07 - Wadhamini",
    s7Heading: "Wadhamini",
    s7Intro:
      "Wadhamini ni watu wanaoweza kuthibitisha utambulisho na tabia yako. Sehemu hii ni kwa madhumuni ya uchapishaji tu.",
    s8Tag: "Hatua 08 - Viambatisho",
    s8Heading: "Viambatisho",
    s8Intro:
      "Pakia nyaraka za ushahidi kama vile cheti chako cha kuzaliwa au nakala ya kitambulisho. Unaweza kuangalia na kuondoa nyaraka kabla ya kuwasilisha.",
    s9Tag: "Hatua 09 - Hakiki na Tamko",
    s9Heading: "Hakiki na Tamko",
    s9Intro:
      "Hakiki taarifa zote ulizotoa. Unaweza kurudi kwenye hatua yoyote kurekebisha kosa, kisha uthibitishe tamko ili kuwasilisha. Kutoa taarifa za uongo ni kosa la jinai chini ya sheria za Tanzania.",
    refereesTitle: "Wadhamini",
    refereesInfo: "Wadhamini wanapangiwa na ofisi ya usajili na wataonekana kwenye fomu yako ya maombi iliyochapishwa. Huhitaji kuingiza taarifa yoyote hapa.",
    refereesNote: "Sehemu hii inashughulikiwa na ofisi ya usajili. Endelea tu kwenye hatua inayofuata.",
    refereesDownload: "Pakua na Uchapishe Fomu ya Wadhamini",
    refereesDownloading: "Inaandaa fomu…",
    refereesDownloadError: "Haikuweza kupakia fomu ya wadhamini. Tafadhali jaribu tena.",
    tipTitle: "Kidokezo cha Msaada",
    tipBody:
      "Ikiwa huwezi kupata Kata yako mahususi, tafadhali chagua eneo la utawala lililo karibu zaidi au wasiliana na simu ya msaada ya Wizara ya Mambo ya Ndani kwa +255-26-2323189.",
    clauseTitle: "Kifungu Rasmi",
    clauseText:
      "Mimi, {name}, natamka kwamba taarifa zote nilizotoa katika fomu hii ya usajili ni za kweli, kamili na sahihi kwa ufahamu wangu wote. Naelewa kuwa taarifa zozote za uongo au kuficha ukweli muhimu kunaweza kusababisha kukataliwa kwa maombi yangu au mashtaka ya jinai chini ya Sheria ya Usalama wa Taifa na Utambulisho wa Kidijitali.",
    agree: "Nakubali masharti na kanuni pamoja na tamko la kisheria hapo juu.",
    landingTitle: "Mfumo wa Usajili wa Kiraia",
    landingTitleAccent: "Tanzania",
    landingIntro:
      "Hii ni huduma inayokuwezesha muombaji kujaza Fomu ya Maombi ya Usajili wa Kiraia kwa njia ya Kielektroniki akiwa mahali popote. Baada ya kujaza fomu hiyo, atatakiwa kuiwasilisha pamoja na vielelezo vingine katika Ofisi ya Uhamiaji iliyo karibu naye kwa ajili ya kushughulikia maombi yake ya Usajili wa Kiraia.",
    startTitle: "Jaza Maombi",
    startDesc:
      "Kwa Mwombaji anayetaka kujaza fomu ya maombi ya Usajili wa Kiraia kwa njia ya kielektroniki.",
    startAction: "Anza Ombi",
    startOwnerTitle: "Jisajili Mwenyewe",
    startOwnerDesc:
      "Kama mmiliki wa wasifu, kamilisha usajili wako kwanza — kabla ya mtu mwingine kuongezwa.",
    startDependentTitle: "Sajili Mtegemezi",
    startDependentDesc:
      "Ongeza mtegemezi (chini ya miaka 18) chini ya wasifu wako.",
    finishFirstNote: "Kamilisha usajili unaoendelea kabla ya kuanza mpya.",
    nothingToResume: "Hakuna usajili unaoendelea.",
    resumeTitle: "Endeleza Ombi",
    resumeDesc:
      "Kwa Mwombaji ambaye alishajaza fomu ya maombi ya Usajili na kufikia hatua ya kupatiwa Namba ya Ombi.",
    resumeAction: "Endeleza Ombi",
    statusTitle: "Ufuatiliaji Ombi",
    statusDesc:
      "Angalia hali na maendeleo ya ombi lako la kupatiwa Cheti cha Usajili ulilowasilisha.",
    statusAction: "Angalia hali ya maombi",
    submittedTitle: "Usajili Umewasilishwa!",
    applicationId: "Namba ya Maombi",
    submittedOn: "Imewasilishwa tarehe {date} — Hifadhi namba hii kwa ufuatiliaji.",
    submittedHelp:
      "Pakua na uchapishe fomu yako ya maombi, kisha uwasilishe nakala iliyochapishwa katika Ofisi ya Uhamiaji iliyo karibu nawe kwa hatua zaidi.",
    downloadPdf: "Pakua PDF",
    printForm: "Chapisha Fomu",
    returnDashboard: "Rudi kwenye Dashibodi",
    checkTitle: "Angalia Hali ya Maombi",
    checkIntro:
      "Weka Namba yako ya Maombi ili kuona hali na maendeleo ya maombi yako ya Usajili wa Kiraia.",
    checkIdLabel: "Namba ya Maombi",
    checkButton: "Angalia Hali",
    checkInvalid: "Tafadhali weka Namba sahihi ya Maombi (mf. CREG260604812345).",
    checkResultTitle: "Hali ya Maombi",
    checkCurrent: "Hali ya Sasa",
    checking: "Inakagua…",
    checkFailed: "Haikuweza kupata hali ya maombi. Tafadhali jaribu tena.",
    checkNotFoundBadge: "Haijapatikana",
    stage1: "Imewasilishwa",
    stage2: "Imeandikishwa",
    stage3: "Imetathminiwa",
    stage4: "Imeidhinishwa",
    stage5: "Hadhi Imetolewa",
    statusIncompleteBadge: "Haijakamilika",
    statusEmailVerified: "Barua pepe imethibitishwa",
    statusActive: "Inatumika",
    statusCreatedAt: "Imeundwa",
    statusUpdatedAt: "Imesasishwa",
    yes: "Ndiyo",
    no: "Hapana",
    status_PENDING: "Inasubiri",
    status_PENDING_ASSESSMENT: "Inasubiri tathmini",
    status_SUBMITTED: "Imewasilishwa",
    status_APPROVED: "Imethibitishwa",
    status_REJECTED: "Imekataliwa",
    status_IN_REVIEW: "Inakaguliwa",
    statusIncompleteMsg:
      "Hujakamilisha kujaza fomu zako za usajili. Tafadhali kamilisha fomu iliyo hapa chini kabla ya kuendelea.",
    statusNextStep: "Fomu inayofuata kukamilisha",
    statusFormProgress: "Maendeleo ya Fomu",
    statusContinue: "Endeleza Usajili",
    idDialogTitle: "Namba ya Maombi Imetengenezwa",
    idDialogEmailed: "Tumetuma nakala kwenye {email}.",
    idDialogHelp:
      "Hifadhi namba hii. Unaweza kuangalia hali ya usajili wako wakati wowote kwa kuitumia — hata kabla ya kumaliza fomu zote.",
    idDialogContinue: "Endelea",
    statusLoginPrompt: "Tafadhali ingia ili kuendelea na usajili wako.",
  },
  forgot: {
    title: "Weka Upya Nenosiri",
    subtitle: "Weka barua pepe au simu yako upokee msimbo wa kuweka upya.",
    identifier: "Barua pepe au simu",
    identifierPlaceholder: "mfano@portal.go.tz",
    identifierRequired: "Tafadhali weka barua pepe au simu yako.",
    sendCode: "Tuma msimbo",
    sending: "Inatuma…",
    otpTitle: "Weka msimbo wa kuweka upya uliotumwa kwenye barua pepe yako",
    otpSentTo: "Weka msimbo wa tarakimu 6 tuliotuma kwa",
    noCode: "Hukupokea msimbo?",
    resend: "Tuma msimbo tena",
    resending: "Inatuma tena…",
    resendIn: "Tuma tena baada ya {seconds}s",
    resent: "Msimbo mpya umetumwa.",
    verify: "Thibitisha msimbo",
    verifying: "Inathibitisha…",
    newPassword: "Nenosiri Jipya",
    confirm: "Thibitisha Nenosiri",
    reset: "Weka Upya Nenosiri",
    resetting: "Inaweka upya…",
    successTitle: "Nenosiri limewekwa upya",
    successMsg: "Nenosiri lako limewekwa upya. Sasa unaweza kuingia.",
    backToLogin: "Rudi kwenye kuingia",
    error: "Hitilafu imetokea. Tafadhali jaribu tena.",
  },
  promo: {
    title: "Tanzania ya Kisasa, Yenye Ukaribu",
    subtitle:
      "Mipaka salama, huduma yenye heshima, na safari laini — uhamiaji unaounganisha raia na wageni na taifa linalostawi.",
    capIdentity: "Umoja",
    capRegistry: "Kisasa",
    capBorder: "Karibu",
  },
  profile: {
    title: "Wasifu Wangu",
    subtitle: "Angalia na sasisha taarifa za akaunti yako na picha.",
    changePhoto: "Badilisha picha",
    removePhoto: "Ondoa picha",
    uploading: "Inapakia…",
    removing: "Inaondoa…",
    photoHint: "JPG au PNG, hadi 500KB.",
    photoInvalidType: "Tafadhali chagua picha ya JPG au PNG.",
    photoTooLarge: "Picha lazima iwe 500KB au chini.",
    photoUpdated: "Picha ya wasifu imesasishwa.",
    photoRemoved: "Picha ya wasifu imeondolewa.",
    photoError: "Imeshindwa kusasisha picha. Tafadhali jaribu tena.",
    save: "Hifadhi mabadiliko",
    saving: "Inahifadhi…",
    saved: "Wasifu umesasishwa.",
    updateError: "Imeshindwa kusasisha wasifu wako. Tafadhali jaribu tena.",
  },
  infoCards: {
    eyebrow: "Kwa Nini ICRCS",
    identityTitle: "Utambulisho Mmoja wa Kitaifa",
    identityBody:
      "Utambulisho mmoja uliothibitishwa kwa kila raia na mkazi — hakuna kumbukumbu zinazojirudia wala udanganyifu.",
    registryTitle: "Daftari Jumuishi la Raia",
    registryBody:
      "Vizazi, makazi, na hali ya kiraia katika hifadhidata moja salama ya kitaifa, inayopatikana kwa taasisi zote.",
    biometricTitle: "Uthibitishaji wa Kibayometriki",
    biometricBody:
      "Alama za vidole na uso huunganisha utambulisho na wewe pekee, kukukinga dhidi ya kujifanya mwingine.",
    borderTitle: "Udhibiti Salama wa Mipaka",
    borderBody:
      "Ukaguzi wa papo kwa papo katika kila uwanja wa ndege na mpaka huhakikisha mipaka ya Tanzania iko salama.",
    passportTitle: "Pasipoti za Kielektroniki na Hati za Safari",
    passportBody:
      "Omba na uhuishe pasipoti za EAC zenye chip na hati za safari bila kupanga foleni ofisini.",
    statusTitle: "Ufuatiliaji wa Hali Saa 24/7",
    statusBody:
      "Fuatilia kila ombi tangu kuwasilisha hadi kuidhinishwa, wakati wowote, kwa kitambulisho chako.",
  },
  idle: {
    title: "Onyo la Muda wa Kikao",
    subtitle: "Umekuwa bila shughuli",
    message:
      "Umekuwa bila shughuli kwa dakika 30. Kwa usalama wako, utatoka moja kwa moja muda wa kuhesabu ukiisha.",
    autoLogout: "Toka moja kwa moja saa ikifika 0:00",
    logoutNow: "Toka Sasa",
    stayLoggedIn: "Endelea Kukaa",
  },
  // RECONSTRUCTED — see the en.fields note. `// REVIEW` marks reconstructed
  // values; the unmarked ones are recovered exact translations.
  fields: {
    // --- recovered exact values ---
    phVillageStreet: "Kijiji / Mtaa",
    phHouseStreet: "Namba ya nyumba / Mtaa",
    phCity: "Jiji",
    phPostal: "Sanduku la posta",
    phRegion: "Mkoa",
    phDistrict: "Wilaya",
    phWard: "Kata",
    phMtaa: "Mtaa",
    phTerritory: "Eneo",
    phSelectTerritoryFirst: "Chagua eneo kwanza",
    phSelectCountryFirst: "Chagua nchi kwanza",
    phSelectRegionFirst: "Chagua mkoa kwanza",
    phSelectDistrictFirst: "Chagua wilaya kwanza",
    phSelectWardFirst: "Chagua kata kwanza",
    phLoadingWards: "Inapakia kata…",
    phLoadingStreets: "Inapakia mitaa…",
    phNoWards: "Hakuna kata zinazopatikana bado",
    phNoStreets: "Hakuna mitaa inayopatikana bado", // REVIEW
    phSearchCountry: "Tafuta nchi…", // REVIEW
    phNoMatch: "Hakuna inayolingana", // REVIEW
    openCalendar: "Fungua kalenda",
    prevMonth: "Mwezi uliopita",
    nextMonth: "Mwezi unaofuata",
    selectMonth: "Chagua mwezi",
    selectYear: "Chagua mwaka",
    chooseFile: "Chagua Faili", // REVIEW
    noFile: "Hakuna faili lililochaguliwa", // REVIEW
    uploading: "Inapakia…", // REVIEW
    // --- reconstructed values (verify) ---
    firstName: "Jina la Kwanza", // REVIEW
    middleName: "Jina la Kati", // REVIEW
    lastName: "Jina la Mwisho", // REVIEW
    fullName: "Jina Kamili", // REVIEW
    gender: "Jinsia", // REVIEW
    dob: "Tarehe ya Kuzaliwa", // REVIEW
    email: "Barua pepe", // REVIEW
    phone: "Namba ya Simu", // REVIEW
    nationality: "Utaifa", // REVIEW
    marriage: "Hali ya Ndoa", // REVIEW
    married: "Je, umeoa/umeolewa?", // REVIEW
    occupation: "Kazi", // REVIEW
    occupationOpt: "Kazi (hiari)", // REVIEW
    relationship: "Uhusiano", // REVIEW
    residence: "Makazi", // REVIEW
    placeOfBirth: "Mahali pa Kuzaliwa", // REVIEW
    placeOfBirthRdw: "Mahali pa Kuzaliwa (Mkoa / Wilaya / Kata)", // REVIEW
    curAddress: "Anuani ya Sasa", // REVIEW
    permAddress: "Anuani ya Kudumu", // REVIEW
    citizenQuestion: "Je, wewe ni raia wa Tanzania?", // REVIEW
    citizenYes: "Ndiyo", // REVIEW
    citizenNo: "Hapana", // REVIEW
    nidaNumber: "Namba ya NIDA", // REVIEW
    birthCertNo: "Namba ya Cheti cha Kuzaliwa", // REVIEW
    indexNo: "Namba ya Mtihani", // REVIEW
    docType: "Aina ya Hati", // REVIEW
    docNumber: "Namba ya Hati", // REVIEW
    docNumberReq: "Namba ya hati inahitajika", // REVIEW
    docFile: "Faili la Hati", // REVIEW
    eduLevel: "Kiwango cha Elimu", // REVIEW
    schoolName: "Jina la Shule", // REVIEW
    schoolDistrict: "Wilaya ya Shule", // REVIEW
    completionYear: "Mwaka wa Kumaliza", // REVIEW
    employment: "Ajira", // REVIEW
    employmentStatus: "Hali ya Ajira", // REVIEW
    employmentStatusOpt: "Hali ya Ajira (hiari)", // REVIEW
    employer: "Mwajiri", // REVIEW
    employerOpt: "Mwajiri (hiari)", // REVIEW
    fatherInfo: "Taarifa za Baba", // REVIEW
    motherInfo: "Taarifa za Mama", // REVIEW
    haveChildren: "Je, una watoto?", // REVIEW
    childrenNote: "Ongeza kila mtoto aliyesajiliwa chini ya wasifu wako.", // REVIEW
    relativesTitle: "Ndugu", // REVIEW
    relativesNote: "Ongeza ndugu wa karibu.", // REVIEW
    relativeN: "Ndugu", // REVIEW
    spouseN: "Mwenzi", // REVIEW
    spouseNote: "Ongeza taarifa za mwenzi wako.", // REVIEW
    schoolN: "Shule", // REVIEW
    schoolNote: "Ongeza kila shule uliyosoma.", // REVIEW
    emergencyContactN: "Mtu wa Kuwasiliana Naye Dharura", // REVIEW
    addRelative: "Ongeza Ndugu", // REVIEW
    addSpouse: "Ongeza Mwenzi", // REVIEW
    addSchool: "Ongeza Shule", // REVIEW
    remove: "Ondoa", // REVIEW
    required: "Inahitajika", // REVIEW
    photo: "Picha", // REVIEW
    photoHint: "Pakia picha ya saizi ya pasipoti (JPG au PNG).", // REVIEW
    photoSizeError: "Picha ni kubwa mno.", // REVIEW
    photoTypeError: "Aina ya picha si sahihi.", // REVIEW
    uploadPhoto: "Pakia Picha", // REVIEW
    changePhoto: "Badilisha Picha", // REVIEW
    uploaded: "Imepakiwa", // REVIEW
    uploadFailed: "Upakiaji umeshindwa", // REVIEW
    uploadsNeedId: "Angalau hati moja ya utambulisho inahitajika.", // REVIEW
    phFirst: "Jina la kwanza", // REVIEW
    phMiddle: "Jina la kati", // REVIEW
    phLast: "Jina la mwisho", // REVIEW
    phFirstName: "Ingiza jina la kwanza", // REVIEW
    phMiddleName: "Ingiza jina la kati", // REVIEW
    phLastName: "Ingiza jina la mwisho", // REVIEW
    phCountry: "Nchi", // REVIEW
    phCountryNat: "Nchi ya utaifa", // REVIEW
    phCityVillageBirth: "Jiji / Kijiji cha kuzaliwa", // REVIEW
    phCityOpt: "Jiji (hiari)", // REVIEW
    phVillage: "Kijiji", // REVIEW
    phStreet: "Mtaa", // REVIEW
    phDocNumber: "Ingiza namba ya hati", // REVIEW
    phSelect: "Chagua", // REVIEW
    phSelectGender: "Chagua jinsia", // REVIEW
    phSelectStatus: "Chagua hali", // REVIEW
    phSelectType: "Chagua aina", // REVIEW
    phSelectLevel: "Chagua kiwango", // REVIEW
    phSelectOccupation: "Chagua kazi", // REVIEW
    phSelectRelationship: "Chagua uhusiano", // REVIEW
  },
  // RECONSTRUCTED — all values reconstructed; verify `// REVIEW`.
  opt: {
    male: "Mwanamume", // REVIEW
    female: "Mwanamke", // REVIEW
    other: "Nyingine", // REVIEW
    single: "Hajaoa/Hajaolewa", // REVIEW
    married: "Ameoa/Ameolewa", // REVIEW
    divorced: "Ametalikiana", // REVIEW
    widowed: "Mjane", // REVIEW
    employed: "Ameajiriwa", // REVIEW
    selfEmployed: "Amejiajiri", // REVIEW
    unemployed: "Hajaajiriwa", // REVIEW
    student: "Mwanafunzi", // REVIEW
    retired: "Mstaafu", // REVIEW
    citBirth: "Kuzaliwa", // REVIEW
    citDescent: "Asili", // REVIEW
    citNaturalization: "Uraia wa Kuandikishwa", // REVIEW
    relParent: "Mzazi", // REVIEW
    relSibling: "Ndugu", // REVIEW
    relSpouse: "Mwenzi", // REVIEW
    relChild: "Mtoto", // REVIEW
    relRelative: "Jamaa", // REVIEW
    relGuardian: "Mlezi", // REVIEW
    relFriend: "Rafiki", // REVIEW
    relOther: "Nyingine", // REVIEW
    occGovernment: "Mfanyakazi wa Serikali", // REVIEW
    occPrivate: "Sekta Binafsi", // REVIEW
    occSelfEmployed: "Amejiajiri", // REVIEW
    occFarmer: "Mkulima", // REVIEW
    occStudent: "Mwanafunzi", // REVIEW
    occRetired: "Mstaafu", // REVIEW
    occUnemployed: "Hajaajiriwa", // REVIEW
    occOther: "Nyingine", // REVIEW
    occBusiness: "Biashara", // REVIEW
    docNida: "Kitambulisho cha Taifa (NIDA)", // REVIEW
    docPassport: "Pasipoti", // REVIEW
    docDriving: "Leseni ya Udereva", // REVIEW
    docVoter: "Kitambulisho cha Mpiga Kura", // REVIEW
  },
  gate: {
    title: "Uhakiki wa Uraia", // REVIEW
    intro: "Thibitisha hali yako ya uraia kuanza usajili.", // REVIEW
    travelDocType: "Aina ya Hati ya Safari", // REVIEW
    verifying: "Inahakiki…", // REVIEW
    notFoundTitle: "Rekodi Haikupatikana", // REVIEW
    notFoundBody: "Hatukuweza kupata rekodi inayolingana. Tafadhali angalia taarifa zako na ujaribu tena.", // REVIEW
    back: "Rudi", // REVIEW
    continue: "Endelea", // REVIEW
    submit: "Wasilisha", // REVIEW
  },
  preview: {
    fullName: "Jina Kamili", // REVIEW
    gender: "Jinsia", // REVIEW
    dob: "Tarehe ya Kuzaliwa", // REVIEW
    phone: "Namba ya Simu", // REVIEW
    email: "Barua pepe", // REVIEW
    nationality: "Utaifa", // REVIEW
    maritalStatus: "Hali ya Ndoa", // REVIEW
    currentlyMarried: "Ameoa/Ameolewa Sasa", // REVIEW
    placeOfBirth: "Mahali pa Kuzaliwa", // REVIEW
    countryOfBirth: "Nchi ya Kuzaliwa", // REVIEW
    nida: "Namba ya NIDA", // REVIEW
    birthCertNo: "Namba ya Cheti cha Kuzaliwa", // REVIEW
    index: "Namba ya Mtihani", // REVIEW
    naturalization: "Uraia wa Kuandikishwa", // REVIEW
    certNo: "Namba ya Cheti", // REVIEW
    issuePlace: "Mahali pa Kutolewa", // REVIEW
    issueDate: "Tarehe ya Kutolewa", // REVIEW
    residence: "Makazi", // REVIEW
    currentAddress: "Anuani ya Sasa", // REVIEW
    permanentAddress: "Anuani ya Kudumu", // REVIEW
    region: "Mkoa", // REVIEW
    district: "Wilaya", // REVIEW
    ward: "Kata", // REVIEW
    village: "Kijiji", // REVIEW
    villageStreet: "Kijiji / Mtaa", // REVIEW
    postalCode: "Msimbo wa Posta", // REVIEW
    father: "Baba", // REVIEW
    mother: "Mama", // REVIEW
    hasChildren: "Ana Watoto", // REVIEW
    relationship: "Uhusiano", // REVIEW
    education: "Elimu", // REVIEW
    level: "Kiwango", // REVIEW
    employment: "Ajira", // REVIEW
    employmentStatus: "Hali ya Ajira", // REVIEW
    employer: "Mwajiri", // REVIEW
    occupation: "Kazi", // REVIEW
    document: "Hati", // REVIEW
    documents: "Hati", // REVIEW
  },
  attach: {
    a1: "Nakala ya Cheti cha Kuzaliwa", // REVIEW
    a2: "Nakala ya Kitambulisho (NIDA / Pasipoti)", // REVIEW
    a4: "Barua ya WEO / VEO", // REVIEW
    a5: "Picha ya Saizi ya Pasipoti", // REVIEW
    a6: "Cheti cha Kitaaluma", // REVIEW
    a7: "Nakala ya Kitambulisho cha Mpiga Kura", // REVIEW
    a8: "Ukurasa wa Pasipoti wenye Taarifa", // REVIEW
  },
  footer: "© 2026 Jamhuri ya Muungano wa Tanzania | Idara ya Uhamiaji",
};

export type Messages = typeof en;

export const messages: Record<Locale, Messages> = { en, sw };
