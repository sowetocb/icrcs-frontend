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
    heading: "Application Status Check",
    label: " Check your application status without login",
    placeholder: "TZN-000-000",
    verify: "Verify status",
    hint: "For more information visit a nearest immigration office.",
    incomplete: "Your registration is not yet complete.",
    atStage: "Current step",
    nextStage: "Next step to complete",
    notStarted: "Not started",
  },
  about: {
    trigger: "About ICRCS",
    title: "Immigration Central Registration & Citizenship System",
    intro: "A unified national platform for citizenship and immigration services.",
    point1: "Securely register and manage citizenship and residency records.",
    point2: "Apply for and track citizenship and immigration applications online.",
    point3: "Verify an application's status anytime without logging in.",
    point4: "Enrol biometric data linked to your national identity.",
    point5: "Available in English and Swahili for all eligible applicants.",
    close: "Close",
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
    connectionError: "We can't reach the server right now. Please check your connection and try again shortly.",
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
    isRequired: "{field} is required.",
    phoneInvalid: "Please enter a valid phone number (at least 7 digits).",
    error: "Registration failed. Please check your details and try again.",
  },
  otp: {
    title: "Enter Verification Code sent to your email",
    expires: "Code Expires in",
    expired: "Verification code expired",
    resend: "Resend code",
    resending: "Resending…",
    resendFailed: "Couldn't resend the code. Please try again.",
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
  session: {
    expiredTitle: "Session Expired",
    expiredBody:
      "Your session has expired for security reasons. Please sign in again to continue.",
    signIn: "Sign in again",
  },
  toast: {
    loginSuccess: "Logged in successfully.",
    otpVerified: "Verification successful. Your account is ready.",
    profileSaved: "Profile updated successfully.",
    stageSaved: "Progress saved.",
    draftSaved: "Your progress has been saved — you can resume anytime.",
    registrationSubmitted: "Registration submitted successfully.",
    minorRegistered: "Minor registered successfully.",
    submitError: "Something went wrong. Please try again.",
  },
  nav: {
    dashboard: "Dashboard",
    registry: "Citizen Registry",
    people: "Registered People",
    visa: "Visa Processing",
    security: "Security Audit",
    logout: "Logout",
    openMenu: "Show menu",
    closeMenu: "Hide menu",
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
    preparing: "Preparing…",
    loadError: "Could not load registered people. Please refresh or try again later.",
    colApplicationId: "Application ID",
    colName: "Applicant Name",
    colStatus: "Status",
    colRegisteredOn: "Registration Date",
    colActions: "Actions",
    statTotal: "Total Registered",
    statCompleted: "Completed",
    statPending: "Pending",
    statRejected: "Rejected",
    searchPlaceholder: "Search by name or application ID…",
    filterAllStatus: "All Status",
    filterAllDates: "All Dates",
    filterToday: "Today",
    filter7Days: "Last 7 days",
    filter30Days: "Last 30 days",
    noResults: "No registered people match your filters.",
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
    photoTitle: "Passport Size Photo",
    photoDesc:
      "A recent, good-quality photo of the applicant clearly showing their face for identification.",
    birthTitle: "Birth Certificate",
    birthDesc:
      "A valid copy of the applicant's birth certificate showing their basic details such as name, date and place of birth.",
    parentTitle: "Parent(s) Certificate",
    parentDesc:
      "Official documents confirming the citizenship or identity of the applicant's parent or parents, where required.",
    letterTitle: "Identification Letter from Local Government",
    letterDesc:
      "An official letter issued by the local or village government confirming the applicant's identity, residence and details.",
  },
  flabel: {
    spouse: "Spouse",
    child: "Child",
    ec1: "Emergency contact 1",
    ec2: "Emergency contact 2",
    rel1: "Relative 1",
    rel2: "Relative 2",
    father: "Father's",
    mother: "Mother's",
    sFirst: "first name",
    sMiddle: "middle name",
    sLast: "last name",
    sDob: "date of birth",
    sGender: "gender",
    sNatCountry: "nationality",
    sPhone: "phone number",
    sRelType: "relationship",
    sPobCountry: "country of birth",
    sPobRegion: "region of birth",
    sPobDistrict: "district of birth",
    sPobWard: "ward of birth",
    sPobStreet: "street/mtaa of birth",
    sVillage: "city/village of birth",
    sPobTerritory: "territory of birth",
    sResTerritory: "territory of residence",
    sResCountry: "country of residence",
    sResRegion: "region of residence",
    sResDistrict: "district of residence",
    sResWard: "ward of residence",
    sResStreet: "street/mtaa of residence",
    sResCity: "city of residence",
    stage1PhotoData: "Passport photo",
    gender: "Gender",
    dob: "Date of birth",
    nationalityCountry: "Nationality",
    pobCountry: "Country of birth",
    pobTerritory: "Territory of birth",
    pobWard: "Ward of birth",
    pobStreet: "Street/Mtaa of birth",
    pobCityVillage: "City/Town of birth",
    marriage: "Marital status",
    phone: "Phone number",
    email: "Email",
    permRegion: "Permanent region",
    permDistrict: "Permanent district",
    permWard: "Permanent ward",
    permTerritory: "Permanent territory",
    permCountry: "Permanent address country",
    permCity: "Permanent address city",
    curRegion: "Current region",
    curDistrict: "Current district",
    curWard: "Current ward",
    curTerritory: "Current territory",
    curCountry: "Current address country",
    curCity: "Current address city",
    jobStatus: "Employment status",
    gateNationality: "Nationality",
    gateDocType: "Travel document type",
    gateDocNumber: "Document number",
    fallback: "a required field",
  },
  registry: {
    stepsLabel: "Registration Steps",
    openSteps: "Show registration steps",
    closeSteps: "Hide registration steps",
    saveExit: "Save & Exit",
    next: "Save",
    complete: "Complete Registration",
    required: "Please fill in all required fields to continue.",
    missingIntro: "Please fill in the following before continuing:",
    ageError: "The account holder must be at least 18 years old.",
    minorError: "Dependents registered under your profile must be under 18 years old.",
    fatherTooYoung: "Father must be at least 16 years older than the applicant.",
    motherTooYoung: "Mother must be at least 16 years older than the applicant.",
    futureDateError: "The date of birth cannot be in the future.",
    submitError: "Could not submit this step. Please try again.",
    attachHint: "Tick a document, then upload it (JPG, PNG or PDF, max 300KB).",
    attachTooLarge: "File must be 300KB or smaller.",
    attachChoose: "Choose file",
    attachPhotoRequired: "Please upload the required Passport Size Photo before continuing.",
    attachMandatoryRequired:
      "Please upload the applicant's and a parent's birth certificate / affidavit before continuing.",
    attachRequiredField: "This document is required before continuing.",
    photoFromStage1: "Uploaded at Personal Information",
    photoUploadRetry: "Photo upload failed due to a network connection issue. Please click Next to retry.",
    photoMissing: "Your passport photo is missing. Please go back to Personal Information to add it.",
    attachIdRequired: "At least one identification document is required for adults.",
    nidaRequired: "Please enter the National ID (NIDA) number for adults.",
    nidaExactDigits: "NIDA number must be exactly 20 digits.",
    schoolRequired: "Please add at least one school, or tick \"I never attended school\".",
    completionYearRange: "Completion year must be between {min} and {year}.",
    eduGapError: "There must be at least {gap} years between {from} and {to}.",
    ecAgeError: "Emergency contacts must be at least 18 years old.",
    spouseAgeError: "Spouse must be at least 16 years old.",
    spouseRequired: "Please provide details for at least one spouse.",
    nameInvalid: "Only letters, spaces, hyphens and apostrophes are allowed.",
    nameTooShort: "Must be at least 2 characters.",
    textTooShort: "Must be at least 2 characters.",
    profileNameInvalid: "Your profile name contains invalid characters. Please update your profile first.",
    docNumberTooShort: "Document number must be at least 3 characters.",
    tinInvalid: "TIN must be 9 digits (Business) or 10 digits (Individual).",
    marriageConflict: "You selected \"{status}\" as your marital status in Personal Information (Step 1). Please go back and update your marital status to \"Married\" before answering \"Yes\" here.",
    marriageLocked: "This is set automatically from your marital status in Personal Information (Step 1): \"{status}\". To change it, go back and update Step 1.",
    unsavedWarning: "You have unsaved changes. Save before leaving, or your changes on this step will be lost. Leave anyway?",
    childrenMinorLocked: "An applicant under 18 cannot register children. This is set automatically from your date of birth in Personal Information (Step 1).",
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
    haveAttendedSchool: "Have you attended school?",
    primaryEducationMandatory: "Primary education is mandatory. Please provide at least your primary school details below.",
    radioYes: "Yes",
    radioNo: "No",
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
    identifierInvalid: "Please enter a valid email address or phone number.",
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
    otpIncorrect: "The verification code you entered is incorrect or has expired. Please check the code and try again.",
    otpIncomplete: "Please enter the complete 6-digit verification code.",
  },
  unlock: {
    title: "Unlock Account",
    verifying: "Verifying your unlock link…",
    successTitle: "Account unlocked",
    successMsg: "Your account has been unlocked. You can now sign in.",
    errorTitle: "Link invalid or expired",
    error: "The unlock link is invalid or has expired. Please try signing in again — a new unlock email will be sent if your account is still locked.",
    missingToken: "No unlock token found. Please use the link from your email.",
    signIn: "Sign in",
    backToLogin: "Back to sign in",
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
    photoHint: "JPG or PNG, up to 300KB.",
    photoInvalidType: "Please choose a JPG or PNG image.",
    photoTooLarge: "Image must be 300KB or smaller.",
    photoUpdated: "Profile photo updated.",
    photoRemoved: "Profile photo removed.",
    photoError: "Could not update the photo. Please try again.",
    save: "Save changes",
    saving: "Saving…",
    saved: "Profile updated.",
    phoneInvalid: "Please enter exactly 9 digits after +255.",
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
    title: "Still there?",
    subtitle: "We noticed you've been away",
    message:
      "It looks like you've been inactive for a little while. To keep your information safe, we'll gently sign you out when the countdown ends — apologies for the interruption. Choose \"Stay Logged In\" to continue.",
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
    phHouseStreet: "House Number / Street (Optional)",
    phCity: "City",
    optional: "Optional",
    fieldRequired: "This field is required.",
    isRequired: "{field} is required.",
    phoneInvalid: "Please enter a valid phone number for the selected country.",
    phPostal: "Postal Address (Optional)",
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
    dependentCitizenQuestion: "Is your dependant / child a Tanzanian citizen?",
    citizenYes: "Yes", // REVIEW
    citizenNo: "No", // REVIEW
    nidaNumber: "NIDA Number", // REVIEW
    birthCertNo: "Birth Certificate Number", // REVIEW
    birthCertFile: "Upload Birth Certificate",
    indexNo: "Index Number", // REVIEW
    docType: "Document Type", // REVIEW
    docNumber: "Document Number", // REVIEW
    idDocNida: "NIDA Number",
    idDocVoter: "Voters ID",
    idDocTin: "TIN Number",
    idDocDriving: "Driving License",
    docNumberReq: "Document number is required", // REVIEW
    docFile: "Document File", // REVIEW
    eduLevel: "Education Level", // REVIEW
    schoolName: "School Name", // REVIEW
    schoolDistrict: "City", // REVIEW
    completionYear: "Completion Year", // REVIEW
    eduCompleted: "I have completed this level",
    eduCompletedOpt: "Completed",
    eduStudyingOpt: "Still studying",
    employment: "Employment", // REVIEW
    employmentStatus: "Employment Status", // REVIEW
    employmentStatusOpt: "Employment Status", // REVIEW
    employer: "Employer", // REVIEW
    employerOpt: "Employer", // REVIEW
    fatherInfo: "Father's Information", // REVIEW
    motherInfo: "Mother's Information", // REVIEW
    haveChildren: "Do you have children?", // REVIEW
    childrenNote: "Add each child registered under your profile.", // REVIEW
    relativesTitle: "Relatives", // REVIEW
    relativesNote: "Add close relatives.", // REVIEW
    relativeN: "Relative {n}",
    spouseN: "Spouse {n}",
    childN: "Child {n}",
    spouseNote: "Add your spouse's details.", // REVIEW
    schoolN: "School", // REVIEW
    schoolNote: "Add each school attended.", // REVIEW
    emergencyContactN: "Emergency Contact", // REVIEW
    emergencyContact1: "Emergency Contact 1",
    emergencyContact2: "Emergency Contact 2",
    addRelative: "Add Relative", // REVIEW
    addSpouse: "Add Spouse", // REVIEW
    addChild: "Add Child",
    addSchool: "Add School", // REVIEW
    addDocument: "Add Document",
    documentN: "Document {n}",
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
    country: "Country",
    phCountryNat: "Country of nationality", // REVIEW
    phCityVillageBirth: "City", // REVIEW
    phCityOpt: "City", // REVIEW
    phVillage: "City", // REVIEW
    phStreet: "Street", // REVIEW
    phDocNumber: "Enter document number", // REVIEW
    phSelect: "Select", // REVIEW
    phSelectGender: "Select gender", // REVIEW
    phSelectStatus: "Select status", // REVIEW
    phSelectType: "Select type", // REVIEW
    phSelectLevel: "Select level", // REVIEW
    phSelectOccupation: "Select occupation", // REVIEW
    selfOccupation: "Nature of self-employment",
    phSelfOccupation: "e.g. Artisan, Trader, Farmer",
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
    separated: "Separated",
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
    docPermit: "Permit",
    docVisa: "Visa",
    docPass: "Pass",
    docOther: "Any other",
    travelPassport: "Passport",
    travelEtd: "Emergency Travel Document (ETD)",
    travelCoi: "Certificate of Identity",
    travelGeneva: "Geneva Convention Travel Document",
    travelLaissez: "Laissez-Passer",
    travelOther: "Other Travel Document",
  },
  gate: {
    title: "Citizenship Check", // REVIEW
    travelDocType: "Travel Document Type", // REVIEW
    verifying: "Verifying…", // REVIEW
    notFoundTitle: "Record Not Found", // REVIEW
    notFoundBody: "We could not find a matching record. Please check your details and try again. If the issue persists visit the nearest immigration office for further assistance.", // REVIEW
    back: "Back", // REVIEW
    continue: "Continue", // REVIEW
    submit: "Submit", // REVIEW
    foundTitle: "Permit Verified",
    foundBody: "We found a matching immigration record.",
    statusLabel: "Immigration Status",
    holderLabel: "Holder",
    permitTypeLabel: "Permit Type",
    permitNumberLabel: "Permit Number",
    expiryLabel: "Valid Until",
    minorQuestion: "Do you have a minor of Tanzanian origin you can register?",
    minorHint: "A child of Tanzanian origin (e.g. a Tanzanian spouse's child) can be registered under your record.",
    minorRequired: "Please select Yes or No.",
    registerMinor: "Register the minor",
    noMinorNote: "Thank you. No further action is required at this time.",
    done: "Done",
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
    country: "Country",
    region: "Region", // REVIEW
    district: "District", // REVIEW
    ward: "Ward", // REVIEW
    street: "Street",
    houseNumber: "House Number",
    city: "City",
    village: "Village", // REVIEW
    villageStreet: "Village / Street", // REVIEW
    postalCode: "Postal Address", // REVIEW
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
    a1: "Applicant Birth Certificate",
    a2: "Father Birth Certificate",
    a3: "Mother Birth Certificate",
    a4: "Letter from Local Government / Employer",
    a5: "Passport Size Photo",
    a6: "Naturalisation / Confirmation / Renounciation Certificate",
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
  about: {
    trigger: "Kuhusu mfumo huu",
    title: "Mfumo Kuu wa Usajili na Uraia wa Uhamiaji",
    intro: "Jukwaa moja la kitaifa kwa huduma za uraia na uhamiaji.",
    point1: "Sajili na simamia kumbukumbu za uraia na ukazi kwa usalama.",
    point2: "Omba na fuatilia maombi ya uraia na uhamiaji mtandaoni.",
    point3: "Thibitisha hali ya ombi wakati wowote bila kuingia.",
    point4: "Sajili taarifa za kibayometriki zilizounganishwa na kitambulisho chako cha taifa.",
    point5: "Inapatikana kwa Kiingereza na Kiswahili kwa waombaji wote wanaostahili.",
    close: "Funga",
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
    connectionError: "Hatuwezi kufikia seva kwa sasa. Tafadhali angalia muunganisho wako na ujaribu tena baadaye.",
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
    isRequired: "{field} inahitajika.",
    phoneInvalid: "Tafadhali weka namba sahihi ya simu (angalau tarakimu 7).",
    error: "Usajili umeshindwa. Tafadhali angalia taarifa zako na ujaribu tena.",
  },
  otp: {
    title: "Weka Msimbo wa Uthibitisho uliotumwa kwenye barua pepe yako",
    expires: "Msimbo utaisha baada ya",
    expired: "Msimbo wa uthibitisho umeisha muda",
    resend: "Tuma msimbo tena",
    resending: "Inatuma tena…",
    resendFailed: "Imeshindikana kutuma msimbo tena. Tafadhali jaribu tena.",
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
  session: {
    expiredTitle: "Muda wa Kikao Umeisha",
    expiredBody:
      "Muda wa kikao chako umeisha kwa sababu za kiusalama. Tafadhali ingia tena ili kuendelea.",
    signIn: "Ingia tena",
  },
  toast: {
    loginSuccess: "Umeingia kwa mafanikio.",
    otpVerified: "Uthibitisho umefanikiwa. Akaunti yako iko tayari.",
    profileSaved: "Wasifu umesasishwa kwa mafanikio.",
    stageSaved: "Maendeleo yamehifadhiwa.",
    draftSaved: "Maendeleo yako yamehifadhiwa — unaweza kuendelea wakati wowote.",
    registrationSubmitted: "Usajili umewasilishwa kwa mafanikio.",
    minorRegistered: "Mtoto amesajiliwa kwa mafanikio.",
    submitError: "Hitilafu imetokea. Tafadhali jaribu tena.",
  },
  nav: {
    dashboard: "Dashibodi",
    registry: "Usajili wa Raia",
    people: "Watu Waliosajiliwa",
    visa: "Uchakataji wa Viza",
    security: "Ukaguzi wa Usalama",
    logout: "Toka",
    openMenu: "Onyesha menyu",
    closeMenu: "Ficha menyu",
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
    preparing: "Inaandaa…",
    loadError: "Haikuweza kupakia watu waliojisajili. Tafadhali sasisha au jaribu tena baadaye.",
    colApplicationId: "Kitambulisho cha Maombi",
    colName: "Jina la Mwombaji",
    colStatus: "Hali",
    colRegisteredOn: "Tarehe ya Usajili",
    colActions: "Vitendo",
    statTotal: "Jumla Waliosajiliwa",
    statCompleted: "Imekamilika",
    statPending: "Inasubiri",
    statRejected: "Imekataliwa",
    searchPlaceholder: "Tafuta kwa jina au kitambulisho cha maombi…",
    filterAllStatus: "Hali Zote",
    filterAllDates: "Tarehe Zote",
    filterToday: "Leo",
    filter7Days: "Siku 7 zilizopita",
    filter30Days: "Siku 30 zilizopita",
    noResults: "Hakuna watu waliosajiliwa wanaolingana na vichujio vyako.",
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
    photoTitle: "Picha ya Passport Size",
    photoDesc:
      "Picha ya hivi karibuni ya mwombaji yenye ubora mzuri, ikionyesha sura yake wazi kwa ajili ya utambulisho.",
    birthTitle: "Cheti cha Kuzaliwa",
    birthDesc:
      "Nakala halali ya cheti cha kuzaliwa cha mwombaji kinachoonyesha taarifa zake za msingi kama jina, tarehe na mahali pa kuzaliwa.",
    parentTitle: "Cheti cha Mzazi/Wazazi",
    parentDesc:
      "Nyaraka rasmi zinazothibitisha uraia au utambulisho wa mzazi au wazazi wa mwombaji, pale inapohitajika.",
    letterTitle: "Barua ya Utambulisho kutoka Serikali za Mitaa",
    letterDesc:
      "Barua rasmi inayotolewa na serikali ya mtaa au kijiji inayothibitisha utambulisho, makazi, na taarifa za mwombaji.",
  },
  flabel: {
    spouse: "Mwenzi",
    child: "Mtoto",
    ec1: "Mtu wa dharura 1",
    ec2: "Mtu wa dharura 2",
    rel1: "Ndugu 1",
    rel2: "Ndugu 2",
    father: "Baba —",
    mother: "Mama —",
    sFirst: "jina la kwanza",
    sMiddle: "jina la kati",
    sLast: "jina la mwisho",
    sDob: "tarehe ya kuzaliwa",
    sGender: "jinsia",
    sNatCountry: "uraia",
    sPhone: "namba ya simu",
    sRelType: "uhusiano",
    sPobCountry: "nchi ya kuzaliwa",
    sPobRegion: "mkoa wa kuzaliwa",
    sPobDistrict: "wilaya ya kuzaliwa",
    sPobWard: "kata ya kuzaliwa",
    sPobStreet: "mtaa wa kuzaliwa",
    sPobTerritory: "himaya ya kuzaliwa",
    sVillage: "jiji/kijiji cha kuzaliwa",
    sResTerritory: "himaya ya makazi",
    sResCountry: "nchi ya makazi",
    sResRegion: "mkoa wa makazi",
    sResDistrict: "wilaya ya makazi",
    sResWard: "kata ya makazi",
    sResStreet: "mtaa wa makazi",
    sResCity: "jiji la makazi",
    stage1PhotoData: "Picha ya pasipoti",
    gender: "Jinsia",
    dob: "Tarehe ya kuzaliwa",
    nationalityCountry: "Uraia",
    pobCountry: "Nchi ya kuzaliwa",
    pobTerritory: "Himaya ya kuzaliwa",
    pobWard: "Kata ya kuzaliwa",
    pobStreet: "Mtaa wa kuzaliwa",
    pobCityVillage: "Mji wa kuzaliwa",
    marriage: "Hali ya ndoa",
    phone: "Namba ya simu",
    email: "Barua pepe",
    permRegion: "Mkoa wa makazi ya kudumu",
    permDistrict: "Wilaya ya makazi ya kudumu",
    permWard: "Kata ya makazi ya kudumu",
    permTerritory: "Himaya ya makazi ya kudumu",
    permCountry: "Nchi ya makazi ya kudumu",
    permCity: "Jiji la makazi ya kudumu",
    curRegion: "Mkoa wa sasa",
    curDistrict: "Wilaya ya sasa",
    curWard: "Kata ya sasa",
    curTerritory: "Himaya ya sasa",
    curCountry: "Nchi ya sasa",
    curCity: "Jiji la sasa",
    jobStatus: "Hali ya ajira",
    gateNationality: "Uraia",
    gateDocType: "Aina ya hati ya safari",
    gateDocNumber: "Namba ya hati",
    fallback: "sehemu inayohitajika",
  },
  registry: {
    stepsLabel: "Hatua za Usajili",
    openSteps: "Onyesha hatua za usajili",
    closeSteps: "Ficha hatua za usajili",
    saveExit: "Hifadhi & Toka",
    next: "Hatua Inayofuata",
    complete: "Kamilisha Usajili",
    required: "Tafadhali jaza sehemu zote zinazohitajika ili kuendelea.",
    missingIntro: "Tafadhali jaza yafuatayo kabla ya kuendelea:",
    ageError: "Mmiliki wa akaunti lazima awe na umri wa angalau miaka 18.",
    minorError: "Wategemezi waliosajiliwa chini ya wasifu wako lazima wawe na umri chini ya miaka 18.",
    fatherTooYoung: "Baba lazima awe mkubwa kwa angalau miaka 16 kuliko mwombaji.",
    motherTooYoung: "Mama lazima awe mkubwa kwa angalau miaka 16 kuliko mwombaji.",
    futureDateError: "Tarehe ya kuzaliwa haiwezi kuwa ya baadaye.",
    submitError: "Imeshindwa kuwasilisha hatua hii. Tafadhali jaribu tena.",
    attachHint: "Weka alama kwenye hati, kisha uipakie (JPG, PNG au PDF, kisichozidi 300KB).",
    attachTooLarge: "Faili lazima liwe 300KB au chini.",
    attachChoose: "Chagua faili",
    attachPhotoRequired: "Tafadhali pakia Picha ya Pasipoti inayohitajika kabla ya kuendelea.",
    attachMandatoryRequired:
      "Tafadhali pakia cheti cha kuzaliwa / kiapo cha mwombaji na cha mzazi kabla ya kuendelea.",
    attachRequiredField: "Hati hii inahitajika kabla ya kuendelea.",
    photoFromStage1: "Imepakiwa kwenye Taarifa Binafsi",
    photoUploadRetry: "Kupakia picha kumeshindikana kwa sababu ya tatizo la mtandao. Tafadhali bofya Endelea kujaribu tena.",
    photoMissing: "Picha yako ya pasipoti haipo. Tafadhali rudi kwenye Taarifa Binafsi kuiongeza.",
    attachIdRequired: "Angalau moja ya nyaraka za utambulisho inahitajika kwa watu wazima.",
    nidaRequired: "Tafadhali ingiza namba ya Kitambulisho cha Taifa (NIDA) kwa watu wazima.",
    nidaExactDigits: "Namba ya NIDA lazima iwe na tarakimu 20 haswa.",
    schoolRequired: "Tafadhali ongeza angalau shule moja, au weka alama \"Sikuwahi kuhudhuria shule\".",
    completionYearRange: "Mwaka wa kumaliza lazima uwe kati ya {min} na {year}.",
    eduGapError: "Lazima kuwe na angalau miaka {gap} kati ya {from} na {to}.",
    ecAgeError: "Mawasiliano ya dharura lazima wawe na umri wa angalau miaka 18.",
    spouseAgeError: "Mwenzi wa ndoa lazima awe na umri wa angalau miaka 16.",
    spouseRequired: "Tafadhali toa taarifa za angalau mwenzi mmoja wa ndoa.",
    nameInvalid: "Tumia herufi, nafasi, kistari au nukta peke yake.",
    nameTooShort: "Lazima iwe na herufi angalau 2.",
    textTooShort: "Lazima iwe na herufi angalau 2.",
    profileNameInvalid: "Jina lako la wasifu lina herufi zisizo sahihi. Tafadhali sasisha wasifu wako kwanza.",
    docNumberTooShort: "Namba ya hati lazima iwe na herufi au tarakimu angalau 3.",
    tinInvalid: "TIN lazima iwe na tarakimu 9 (Biashara) au 10 (Mtu binafsi).",
    marriageConflict: "Umechagua \"{status}\" kama hali ya ndoa katika Taarifa Binafsi (Hatua ya 1). Tafadhali rudi na ubadilishe hali ya ndoa kuwa \"Ameoa/Ameolewa\" kabla ya kujibu \"Ndiyo\" hapa.",
    marriageLocked: "Hii imewekwa moja kwa moja kutoka hali yako ya ndoa katika Taarifa Binafsi (Hatua ya 1): \"{status}\". Ili kuibadilisha, rudi Hatua ya 1.",
    unsavedWarning: "Una mabadiliko ambayo hayajahifadhiwa. Hifadhi kabla ya kuondoka, vinginevyo mabadiliko ya hatua hii yatapotea. Ondoka hata hivyo?",
    childrenMinorLocked: "Mwombaji aliye chini ya miaka 18 hawezi kusajili watoto. Hii imewekwa moja kwa moja kutoka tarehe yako ya kuzaliwa katika Taarifa Binafsi (Hatua ya 1).",
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
    haveAttendedSchool: "Je, umewahi kwenda shule?",
    primaryEducationMandatory: "Elimu ya msingi ni lazima. Tafadhali toa angalau taarifa za shule yako ya msingi hapa chini.",
    radioYes: "Ndiyo",
    radioNo: "Hapana",
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
    stage1: "Ombi limewasilishwa",
    stage2: "Ombi limeandikishwa",
    stage3: "Ombi limetathminiwa",
    stage4: "Ombi limeidhinishwa",
    stage5: "Hadhi ya Kiuhamiaji imetolewa",
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
    identifierInvalid: "Tafadhali weka anuani sahihi ya barua pepe au namba ya simu.",
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
    otpIncorrect: "Msimbo wa uthibitisho uliouweka si sahihi au umekwisha muda. Tafadhali angalia msimbo na ujaribu tena.",
    otpIncomplete: "Tafadhali weka msimbo kamili wa tarakimu 6.",
  },
  unlock: {
    title: "Fungua Akaunti",
    verifying: "Inathibitisha kiungo chako cha kufungua…",
    successTitle: "Akaunti imefunguliwa",
    successMsg: "Akaunti yako imefunguliwa. Sasa unaweza kuingia.",
    errorTitle: "Kiungo si sahihi au kimekwisha muda",
    error: "Kiungo cha kufungua si sahihi au kimekwisha muda. Tafadhali jaribu kuingia tena — barua pepe mpya ya kufungua itatumwa ikiwa akaunti yako bado imefungwa.",
    missingToken: "Hakuna tokeni ya kufungua. Tafadhali tumia kiungo kutoka kwa barua pepe yako.",
    signIn: "Ingia",
    backToLogin: "Rudi kwenye kuingia",
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
    photoHint: "JPG au PNG, hadi 300KB.",
    photoInvalidType: "Tafadhali chagua picha ya JPG au PNG.",
    photoTooLarge: "Picha lazima iwe 300KB au chini.",
    photoUpdated: "Picha ya wasifu imesasishwa.",
    photoRemoved: "Picha ya wasifu imeondolewa.",
    photoError: "Imeshindwa kusasisha picha. Tafadhali jaribu tena.",
    save: "Hifadhi mabadiliko",
    saving: "Inahifadhi…",
    saved: "Wasifu umesasishwa.",
    phoneInvalid: "Tafadhali weka tarakimu 9 haswa baada ya +255.",
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
    title: "Bado upo?",
    subtitle: "Tumegundua umekuwa mbali",
    message:
      "Inaonekana umekuwa bila shughuli kwa muda kidogo. Ili kulinda taarifa zako, tutakutoa kwa upole muda wa kuhesabu ukiisha — tunaomba radhi kwa usumbufu. Chagua \"Endelea Kukaa\" ili kuendelea.",
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
    optional: "Si lazima",
    fieldRequired: "Sehemu hii inahitajika.",
    isRequired: "{field} inahitajika.",
    phoneInvalid: "Tafadhali weka namba sahihi ya simu kwa nchi uliyochagua.",
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
    dependentCitizenQuestion: "Je, mtegemewa / mtoto wako ni raia wa Tanzania?",
    citizenYes: "Ndiyo", // REVIEW
    citizenNo: "Hapana", // REVIEW
    nidaNumber: "Namba ya NIDA", // REVIEW
    birthCertNo: "Namba ya Cheti cha Kuzaliwa", // REVIEW
    birthCertFile: "Cheti cha Kuzaliwa (pakia)",
    indexNo: "Namba ya Mtihani", // REVIEW
    docType: "Aina ya Hati", // REVIEW
    docNumber: "Namba ya Hati", // REVIEW
    idDocNida: "Namba ya NIDA",
    idDocVoter: "Kitambulisho cha Mpiga Kura",
    idDocTin: "Namba ya TIN",
    idDocDriving: "Leseni ya Udereva",
    docNumberReq: "Namba ya hati inahitajika", // REVIEW
    docFile: "Faili la Hati", // REVIEW
    eduLevel: "Kiwango cha Elimu", // REVIEW
    schoolName: "Jina la Shule", // REVIEW
    schoolDistrict: "Wilaya ya Shule", // REVIEW
    completionYear: "Mwaka wa Kumaliza", // REVIEW
    eduCompleted: "Nimemaliza kiwango hiki",
    eduCompletedOpt: "Nimemaliza",
    eduStudyingOpt: "Bado nasoma",
    employment: "Ajira", // REVIEW
    employmentStatus: "Hali ya Ajira", // REVIEW
    employmentStatusOpt: "Hali ya Ajira (hiari)", // REVIEW
    employer: "Mwajiri", // REVIEW
    employerOpt: "Mwajiri", // REVIEW
    fatherInfo: "Taarifa za Baba", // REVIEW
    motherInfo: "Taarifa za Mama", // REVIEW
    haveChildren: "Je, una watoto?", // REVIEW
    childrenNote: "Ongeza kila mtoto aliyesajiliwa chini ya wasifu wako.", // REVIEW
    relativesTitle: "Ndugu", // REVIEW
    relativesNote: "Ongeza ndugu wa karibu.", // REVIEW
    relativeN: "Ndugu {n}",
    spouseN: "Mwenzi {n}",
    childN: "Mtoto {n}",
    spouseNote: "Ongeza taarifa za mwenzi wako.", // REVIEW
    schoolN: "Shule", // REVIEW
    schoolNote: "Ongeza kila shule uliyosoma.", // REVIEW
    emergencyContactN: "Mtu wa Dharura", // REVIEW
    emergencyContact1: "Mtu wa Kwanza wa Dharura",
    emergencyContact2: "Mtu wa Pili wa Dharura",
    addRelative: "Ongeza Ndugu", // REVIEW
    addSpouse: "Ongeza Mwenzi", // REVIEW
    addChild: "Ongeza Mtoto",
    addSchool: "Ongeza Shule", // REVIEW
    addDocument: "Ongeza Hati",
    documentN: "Hati {n}",
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
    country: "Nchi",
    phCountryNat: "Nchi ya utaifa", // REVIEW
    phCityVillageBirth: "Jiji", // REVIEW
    phCityOpt: "Jiji (hiari)", // REVIEW
    phVillage: "Jiji", // REVIEW
    phStreet: "Mtaa", // REVIEW
    phDocNumber: "Ingiza namba ya hati", // REVIEW
    phSelect: "Chagua", // REVIEW
    phSelectGender: "Chagua jinsia", // REVIEW
    phSelectStatus: "Chagua hali", // REVIEW
    phSelectType: "Chagua aina", // REVIEW
    phSelectLevel: "Chagua kiwango", // REVIEW
    phSelectOccupation: "Chagua kazi", // REVIEW
    selfOccupation: "Aina ya kujiajiri",
    phSelfOccupation: "k.m. Fundi, Mfanyabiashara, Mkulima",
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
    separated: "Tumetengana", // REVIEW
    employed: "Nimeajiriwa", // REVIEW
    selfEmployed: "Nimejiajiri", // REVIEW
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
    relRelative: "Ndugu wa karibu",
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
    docPermit: "Kibali", // REVIEW
    docVisa: "Viza", // REVIEW
    docPass: "Pasi", // REVIEW
    docOther: "Nyingine yoyote", // REVIEW
    travelPassport: "Pasipoti", // REVIEW
    travelEtd: "Hati ya Dharura ya Kusafiri (ETD)", // REVIEW
    travelCoi: "Cheti cha Utambulisho", // REVIEW
    travelGeneva: "Hati ya Kusafiri ya Mkataba wa Geneva", // REVIEW
    travelLaissez: "Laissez-Passer", // REVIEW
    travelOther: "Hati Nyingine ya Kusafiri", // REVIEW
  },
  gate: {
    title: "Uhakiki wa Uraia", // REVIEW
    travelDocType: "Aina ya Hati ya Safari", // REVIEW
    verifying: "Inahakiki…", // REVIEW
    notFoundTitle: "Rekodi Haikupatikana", // REVIEW
    notFoundBody: "Hatukuweza kupata rekodi inayolingana. Tafadhali angalia taarifa zako na ujaribu tena. Kama unashindwa kupata taarifa zako, tafadhali tembelea ofisi ya uhamiaji iliyo karibu nawe kwa msaada zaidi", // REVIEW
    back: "Rudi", // REVIEW
    continue: "Endelea", // REVIEW
    submit: "Wasilisha", // REVIEW
    foundTitle: "Kibali Kimethibitishwa",
    foundBody: "Tumepata rekodi ya uhamiaji inayolingana.",
    statusLabel: "Hadhi ya Uhamiaji",
    holderLabel: "Mmiliki",
    permitTypeLabel: "Aina ya Kibali",
    permitNumberLabel: "Namba ya Kibali",
    expiryLabel: "Inakwisha",
    minorQuestion: "Je, una mtoto mdogo mwenye asili ya Kitanzania unayeweza kumsajili?",
    minorHint: "Mtoto mwenye asili ya Kitanzania (mfano mtoto wa mwenzi wa Kitanzania) anaweza kusajiliwa chini ya rekodi yako.",
    minorRequired: "Tafadhali chagua Ndiyo au Hapana.",
    registerMinor: "Msajili mtoto",
    noMinorNote: "Asante. Hakuna hatua zaidi zinazohitajika kwa sasa.",
    done: "Maliza",
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
    country: "Nchi",
    region: "Mkoa", // REVIEW
    district: "Wilaya", // REVIEW
    ward: "Kata", // REVIEW
    street: "Mtaa",
    houseNumber: "Namba ya Nyumba",
    city: "Jiji",
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
    a1: "Cheti cha Kuzaliwa cha Mwombaji", // REVIEW
    a2: "Cheti cha Kuzaliwa cha Baba", // REVIEW
    a3: "Cheti cha Kuzaliwa cha Mama", // REVIEW
    a4: "Barua kutoka Serikali ya Mtaa / Mwajiri", // REVIEW
    a5: "Picha ya Saizi ya Pasipoti", // REVIEW
    a6: "Cheti cha Uraia / Uthibitisho / Kuachia Uraia", // REVIEW
  },
  footer: "© 2026 Jamhuri ya Muungano wa Tanzania | Idara ya Uhamiaji",
};

export type Messages = typeof en;

export const messages: Record<Locale, Messages> = { en, sw };
