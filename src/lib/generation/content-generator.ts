import { BusinessProfile } from "@/types/business-profile";
import { SectionInstance, SectionType } from "@/types/section";
import { getDefaultSectionInstance } from "@/constants/sections";
import { generateSectionId } from "@/lib/sections/id-generator";

export class ContentGenerator {
  /**
   * Generates copy for an individual section instance based on business context.
   */
  public generateSectionContent(
    profile: BusinessProfile,
    sectionType: SectionType,
    order: number,
    existingSection?: SectionInstance
  ): SectionInstance {
    const base = existingSection ? { ...existingSection } : getDefaultSectionInstance(sectionType, order, profile.websiteType);
    base.id = existingSection?.id || generateSectionId(sectionType);
    base.order = order;
    base.visible = existingSection?.visible !== undefined ? existingSection.visible : true;

    const s = { ...base.settings };
    const name = profile.businessName || "Our Business";
    const category = profile.businessCategory || profile.industry || "Professional Services";
    const audience = profile.primaryAudience || "our valued clients";
    const description = profile.description || "";
    const contact = profile.contactInfo;

    switch (sectionType) {
      case "hero_full_width":
      case "hero_split":
      case "hero_product_showcase":
      case "hero_minimal":
      case "hero_cinematic": {
        const headline = this.generateHeroHeadline(profile);
        const subheadline = this.generateHeroSubheadline(profile);
        s.headline = headline;
        s.subheadline = subheadline;
        s.badge = this.generateHeroBadge(profile);
        s.ctaText = this.generateCtaText(profile);
        s.ctaUrl = this.generateCtaUrl(profile);
        if (profile.bannerUrl) {
          s.imageUrl = profile.bannerUrl;
          s.backgroundImageUrl = profile.bannerUrl;
          s.bannerUrl = profile.bannerUrl;
        }
        s.bulletPoints = this.generateHeroBullets(profile);

        if (sectionType === "hero_minimal") {
          s.eyebrow = s.badge;
          s.body = subheadline;
          s.linkText = s.ctaText;
          s.linkUrl = s.ctaUrl;
        }
        break;
      }

      case "benefits_grid": {
        s.title = `About ${name}`;
        s.subtitle = profile.websiteType === "appointments"
          ? `Service overview and consultation details for ${audience}.`
          : profile.websiteType === "lead_gen"
          ? `Advisory overview and engagement details for ${audience}.`
          : `Service overview and catalog features for ${audience}.`;
        const benefits = this.generateBenefits(profile);
        s.items = benefits;
        break;
      }

      case "brand_story": {
        s.headline = `About ${name}`;
        s.subheadline = `Specialized in ${category}`;
        s.bodyParagraph1 = profile.aboutStory || description || (
          profile.websiteType === "appointments"
            ? `${name} offers dedicated ${category} appointments and professional services. Direct consultation channels are provided on this site.`
            : profile.websiteType === "lead_gen"
            ? `${name} offers strategic ${category} advisory and client solutions. Direct inquiry channels are provided on this site.`
            : `${name} offers ${category} services and catalog options. Direct communication channels are provided on this site.`
        );
        s.bodyParagraph2 = profile.differentiators && profile.differentiators.length > 0
          ? `Merchant-stated focus areas: ${profile.differentiators.join(", ")}.`
          : (
            profile.websiteType === "appointments"
              ? `Published appointment details and contact information are available below.`
              : profile.websiteType === "lead_gen"
              ? `Published inquiry details and contact information are available below.`
              : `Published catalog details and contact information are available below.`
          );
        if (profile.logoUrl) {
          s.imageUrl = profile.logoUrl;
        }
        break;
      }

      case "how_it_works": {
        s.title = "Our Process";
        s.subtitle = `Overview of steps for engagement and service delivery.`;
        s.steps = this.generateProcessSteps(profile);
        break;
      }

      case "brand_values": {
        s.title = "Core Principles";
        s.subtitle = "Guiding operational focus and service scope.";
        s.values = this.generateValues(profile);
        break;
      }

      case "faq_accordion": {
        s.title = "Frequently Asked Questions";
        s.subtitle = "Information regarding services, scheduling, and inquiries.";
        s.faqs = this.generateFaqs(profile);
        break;
      }

      case "contact_info": {
        s.title = "Get In Touch";
        s.subtitle = "Reach out directly to discuss your requirements or schedule a consultation.";
        s.phone = contact?.phone || "[Direct Office Phone]";
        s.email = contact?.email || "[Contact Email Address]";
        s.address = contact?.address || (contact?.city ? `${contact.city}, ${contact.country || ""}` : "[Office / Studio Address]");
        s.hours = contact?.businessHours || "[Operating Hours: e.g. Mon - Fri 9:00 AM - 6:00 PM]";
        break;
      }

      case "trust_badges": {
        s.title = "Commitment to Excellence";
        if (profile.certifications && profile.certifications.length > 0) {
          s.badges = profile.certifications.slice(0, 3).map((cert) => {
            if (typeof cert === "string") {
              return {
                title: cert,
                description: "Merchant-provided declaration (unverified).",
              };
            }
            const body = cert.issuingBody ? `Declared: ${cert.issuingBody}` : "unverified";
            return {
              title: cert.name,
              description: `Merchant-provided declaration (${body}).`,
            };
          });
        } else {
          s.badges = [
            { title: "Direct Inquiries", description: "Inquiry and contact options provided on this site." },
            { title: "Service Overview", description: "Structured details on services and offerings." },
            { title: "Consultation Scheduling", description: "Options to request appointments or submit inquiries." },
          ];
        }
        break;
      }

      case "shipping_returns": {
        s.title = "Shipping & Fulfillment";
        s.subtitle = "Information regarding order fulfillment and return procedures.";
        // Shipping and dispatch details are displayed only when supplied by the merchant.
        // Missing merchant information does not create an implied shipping policy.
        s.deliveryPolicy = profile.shippingPolicy || "Order terms and store policies are provided directly by the merchant.";
        s.returnPolicy = profile.returnPolicy || "Store return terms and customer policies are defined directly by the merchant.";
        break;
      }

      case "newsletter_signup": {
        s.headline = "Stay Informed";
        s.subheadline = `Subscribe for announcements, product releases, and updates from ${name}.`;
        s.buttonText = "Subscribe";
        break;
      }

      case "footer_custom": {
        s.companyName = name;
        s.tagline = `${category} · Built with excellence.`;
        s.copyrightText = `© ${new Date().getFullYear()} ${name}. All rights reserved.`;
        break;
      }

      default:
        // Keep existing or default settings
        break;
    }

    base.settings = s;
    return base;
  }

  // -------------------------------------------------------------
  // Context-Aware Content Generators
  // -------------------------------------------------------------

  public generateHeroHeadline(profile: BusinessProfile): string {
    const name = profile.businessName;
    const cat = `${profile.businessCategory || ""} ${profile.industry || ""} ${profile.description || ""}`.toLowerCase();

    if (cat.includes("law") || cat.includes("legal") || cat.includes("litigation") || cat.includes("counsel")) {
      return `Strategic Legal Counsel & Advocacy`;
    }
    if (cat.includes("restaurant") || cat.includes("dining") || cat.includes("culinary")) {
      return `Artisanal Dining & Thoughtful Culinary Craft`;
    }
    if (cat.includes("fitness") || cat.includes("gym") || cat.includes("conditioning") || cat.includes("athletic")) {
      return `Fitness Instruction & Workout Programs`;
    }
    if (cat.includes("software") || cat.includes("saas") || cat.includes("tech")) {
      return `Workflow Infrastructure for Business Teams`;
    }
    if (cat.includes("medical") || cat.includes("clinic") || cat.includes("health") || cat.includes("wellness")) {
      return `Healthcare Practice Centered on Patient Care`;
    }
    if (cat.includes("fashion") || cat.includes("apparel") || cat.includes("boutique")) {
      return `Contemporary Apparel & Clothing Selections`;
    }

    return name ? `${name} · ${profile.businessCategory || profile.industry}` : "Dedicated Service & Offerings";
  }

  public generateHeroSubheadline(profile: BusinessProfile): string {
    const cat = `${profile.businessCategory || ""} ${profile.industry || ""} ${profile.description || ""}`.toLowerCase();
    const audience = profile.primaryAudience;

    if (cat.includes("law") || cat.includes("legal") || cat.includes("litigation") || cat.includes("counsel")) {
      return audience
        ? `Providing ${audience} with legal guidance, documentation analysis, and representation.`
        : "Providing legal advisory and representation services for individual and commercial clients.";
    }
    if (cat.includes("restaurant") || cat.includes("dining") || cat.includes("culinary")) {
      return "Dining menus and beverage selections served in a restaurant setting.";
    }
    if (cat.includes("fitness") || cat.includes("gym") || cat.includes("conditioning") || cat.includes("athletic")) {
      return "Training sessions, scheduled classes, and instruction designed for gym members.";
    }
    if (cat.includes("software") || cat.includes("saas") || cat.includes("tech")) {
      return "Business applications and workflow tools to coordinate organization processes.";
    }
    if (cat.includes("medical") || cat.includes("clinic") || cat.includes("health") || cat.includes("wellness")) {
      return "General consultations and wellness information tailored to patient inquiries.";
    }

    return profile.description || `Providing ${profile.businessCategory || profile.industry} services and catalog options.`;
  }

  public generateHeroBadge(profile: BusinessProfile): string {
    if (profile.badge) return profile.badge;
    const cat = `${profile.businessCategory || ""} ${profile.industry || ""} ${profile.description || ""}`.toLowerCase();
    const type = profile.websiteType;

    if (type === "appointments") {
      if (cat.includes("law") || cat.includes("legal") || cat.includes("advocacy") || cat.includes("counsel")) {
        return "Legal Consultation Services";
      }
      if (cat.includes("medical") || cat.includes("clinic") || cat.includes("health")) {
        return "Clinical Appointments";
      }
      if (cat.includes("fitness") || cat.includes("gym") || cat.includes("conditioning")) {
        return "Training & Sessions";
      }
      return "Practice Overview";
    }

    if (type === "lead_gen") {
      if (cat.includes("growth") || cat.includes("strategy") || cat.includes("advisory") || cat.includes("consulting")) {
        return "Growth Advisory";
      }
      if (cat.includes("software") || cat.includes("saas") || cat.includes("tech")) {
        return "Enterprise Solutions";
      }
      return "Advisory Services";
    }

    return profile.brandPersonality
      ? `${profile.brandPersonality.toUpperCase()} · ${profile.businessCategory || profile.industry || "Catalog"}`
      : "Featured Collection";
  }

  public generateHeroBullets(profile: BusinessProfile): string[] {
    if (profile.keyFeatures && profile.keyFeatures.length > 0) {
      return profile.keyFeatures.slice(0, 3);
    }
    const cat = `${profile.businessCategory || ""} ${profile.industry || ""} ${profile.description || ""}`.toLowerCase();
    const type = profile.websiteType;

    if (type === "appointments") {
      if (cat.includes("law") || cat.includes("legal") || cat.includes("advocacy") || cat.includes("counsel")) {
        return [
          "Confidential consultation enquiries",
          "Connect with the legal team",
          "Explore practice areas",
        ];
      }
      return [
        "Confidential consultation enquiries",
        "Connect with the practice team",
        "Explore consultation options",
      ];
    }

    if (type === "lead_gen") {
      if (cat.includes("growth") || cat.includes("strategy") || cat.includes("advisory")) {
        return [
          "Discuss your business goals",
          "Explore advisory services",
          "Request an initial assessment",
        ];
      }
      return [
        "Discuss your business requirements",
        "Explore strategic solutions",
        "Request an initial assessment",
      ];
    }

    return [
      "Curated catalog selections",
      "Detailed product specifications",
      "Direct merchant ordering",
    ];
  }

  public generateCtaText(profile: BusinessProfile): string {
    const cat = `${profile.businessCategory || ""} ${profile.industry || ""} ${profile.description || ""}`.toLowerCase();
    const type = profile.websiteType;

    if (type === "appointments") {
      if (cat.includes("fitness")) return "Book a Session";
      if (cat.includes("medical") || cat.includes("clinic")) return "Schedule Appointment";
      return "Book Consultation";
    }

    if (type === "lead_gen") {
      if (cat.includes("software") || cat.includes("saas")) return "Request a Demo";
      if (cat.includes("restaurant") || cat.includes("dining") || cat.includes("culinary")) return "Request a Reservation";
      return "Request Consultation";
    }

    return "Explore Collection";
  }

  public generateCtaUrl(profile: BusinessProfile): string {
    if (profile.websiteType === "appointments") return "#booking-section";
    if (profile.websiteType === "lead_gen") return "#inquiry-form";
    return "#catalog";
  }

  public generateBenefits(profile: BusinessProfile): Array<{ title: string; description: string; icon?: string }> {
    // If merchant explicitly provided keyFeatures, honor genuine merchant claims
    if (profile.keyFeatures && profile.keyFeatures.length >= 3) {
      return profile.keyFeatures.slice(0, 3).map((feat, idx) => ({
        title: feat,
        description: profile.differentiators?.[idx] || "Merchant-supplied specification and commitment.",
      }));
    }

    const cat = `${profile.businessCategory || ""} ${profile.industry || ""} ${profile.description || ""}`.toLowerCase();

    if (cat.includes("law") || cat.includes("legal")) {
      return [
        { title: "Practice Areas", description: "Published listings of legal practice areas and advisory service categories." },
        { title: "Consultation Requests", description: "Intake inquiry forms to request an initial consultation or case discussion." },
        { title: "Engagement Terms", description: "Published information on standard consultation procedures and contact details." },
      ];
    }

    if (cat.includes("fitness") || cat.includes("gym") || cat.includes("conditioning") || cat.includes("training")) {
      return [
        { title: "Class Schedules", description: "Published timetable of group training sessions and available class times." },
        { title: "Session Booking", description: "Online appointment scheduling for classes and private training sessions." },
        { title: "Session Details", description: "Details on session formats, preparation guidance, and attendance guidelines." },
      ];
    }

    if (cat.includes("software") || cat.includes("saas") || cat.includes("tech")) {
      return [
        { title: "Feature Overview", description: "Published documentation and specifications of software features." },
        { title: "Demonstration Inquiries", description: "Direct inquiry submission to request a product walkthrough or demonstration." },
        { title: "Technical Resources", description: "Access to published user guides, overview materials, and release notes." },
      ];
    }

    if (cat.includes("fashion") || cat.includes("apparel") || cat.includes("clothing") || profile.websiteType === "ecommerce") {
      return [
        { title: "Catalog Selections", description: "Browse apparel collections with published sizing, colorways, and item details." },
        { title: "Product Specifications", description: "Published garment measurements, material compositions, and care guides." },
        { title: "Cart & Checkout", description: "Direct-to-cart ordering with review of item quantities and order summary." },
      ];
    }

    if (cat.includes("restaurant") || cat.includes("dining") || cat.includes("culinary")) {
      return [
        { title: "Dining Menus", description: "Published lunch, dinner, and beverage menus with item descriptions and pricing." },
        { title: "Reservation Requests", description: "Online reservation request form for table bookings and private dining inquiries." },
        { title: "Visiting Information", description: "Operating hours, restaurant address, seating guidelines, and location details." },
      ];
    }

    if (profile.websiteType === "appointments") {
      return [
        { title: "Service Overview", description: `Consultation details and service information for ${profile.businessCategory || "client"} appointments.` },
        { title: "Contact Channels", description: "Direct inquiry and consultation request options available on this site." },
        { title: "Structured Details", description: "Published options, appointment formats, and schedules for review." },
      ];
    }

    if (profile.websiteType === "lead_gen") {
      return [
        { title: "Advisory Overview", description: `Strategic service listings and advisory scope for ${profile.businessCategory || "client"} engagements.` },
        { title: "Contact Channels", description: "Direct inquiry and consultation request options available on this site." },
        { title: "Structured Details", description: "Published options, advisory scopes, and engagement milestones." },
      ];
    }

    return [
      { title: "Service Overview", description: `Catalog and service listings for ${profile.businessCategory || "client"} offerings.` },
      { title: "Contact Channels", description: "Direct inquiry and consultation request options available on this site." },
      { title: "Structured Details", description: "Published options, service scopes, and descriptions for review." },
    ];
  }

  public generateProcessSteps(profile: BusinessProfile): Array<{ stepNumber: number; title: string; description: string }> {
    const cat = (profile.businessCategory || profile.industry || "").toLowerCase();

    if (cat.includes("law") || cat.includes("legal") || profile.websiteType === "lead_gen") {
      return [
        { stepNumber: 1, title: "Inquiry Submission", description: "Submit project details and background via the website intake form." },
        { stepNumber: 2, title: "Consultation Review", description: "Schedule or conduct an introductory discussion to define scope and requirements." },
        { stepNumber: 3, title: "Engagement Scoping", description: "Establish agreed deliverables, schedule, and ongoing communication preferences." },
      ];
    }

    if (profile.websiteType === "appointments") {
      return [
        { stepNumber: 1, title: "Select Service & Time", description: "Choose an available appointment slot directly through the online schedule." },
        { stepNumber: 2, title: "Review Details", description: "View your appointment booking summary and scheduled time slot." },
        { stepNumber: 3, title: "Attend Session", description: "Attend your scheduled session at the appointed time." },
      ];
    }

    return [
      { stepNumber: 1, title: "Browse Catalog", description: "Review catalog items with published sizing charts and product details." },
      { stepNumber: 2, title: "Submit Order", description: "Enter delivery details and complete order processing." },
      { stepNumber: 3, title: "Order Receipt", description: "Receive order confirmation and purchase details from the merchant." },
    ];
  }

  public generateValues(profile: BusinessProfile): Array<{ title: string; description: string }> {
    const focus = profile.differentiators && profile.differentiators.length > 0
      ? `Merchant-stated focus: ${profile.differentiators[0]}.`
      : "Published service offerings and direct communication options.";
    return [
      { title: "Direct Contact", description: focus },
      { title: "Service Scope", description: "Documented specifications and published offerings." },
      { title: "Client Communication", description: "Inquiry and contact options provided directly through the website." },
    ];
  }

  public generateFaqs(profile: BusinessProfile): Array<{ question: string; answer: string }> {
    if (profile.faqs && profile.faqs.length > 0) {
      return profile.faqs;
    }

    const cat = (profile.businessCategory || profile.industry || "").toLowerCase();

    if (cat.includes("law") || cat.includes("legal")) {
      return [
        { question: "How are consultations conducted?", answer: "Consultations can be scheduled in-person at our office or remotely via video conference depending on your preference." },
        { question: "How is inquiry information used?", answer: "Information submitted via this site is used to process your consultation request." },
        { question: "What should I prepare prior to our first meeting?", answer: "We recommend assembling relevant contracts, correspondence, or documents summarizing the background of your matter." },
      ];
    }

    if (cat.includes("fitness") || cat.includes("gym")) {
      return [
        { question: "Do I need previous fitness experience to start?", answer: "No. Sessions and workout plans can accommodate various initial experience levels." },
        { question: "Can appointments be cancelled or rescheduled?", answer: "Appointments can be managed or cancelled online using the reference link provided with your booking." },
        { question: "What should I bring to my first session?", answer: "Please bring comfortable workout attire, supportive training shoes, and a refillable water bottle." },
      ];
    }

    if (profile.websiteType === "appointments") {
      return [
        { question: "How do I book or reschedule an appointment?", answer: "Select an available date and time slot from our booking calendar. You can reschedule or manage appointments online using your booking reference." },
        { question: "Can I choose between virtual and in-person sessions?", answer: "Yes, meeting options (video conference, phone call, or in-person) are clearly indicated for each service." },
      ];
    }

    return [
      { question: "How can I contact your team with specific questions?", answer: "You can submit inquiries through the contact form or using the details provided on this website." },
      { question: "How will my inquiry be handled?", answer: "Inquiries submitted through this site are delivered directly to the merchant for follow-up." },
    ];
  }
}
