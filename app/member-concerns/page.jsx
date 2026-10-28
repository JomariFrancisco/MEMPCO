'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  CircleHelp,
  FileText,
  Mail,
  MessageCircle,
  Paperclip,
  Phone,
  PiggyBank,
  UsersRound,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import {
  createConcernReference,
  loadMemberConcernBranches,
  submitMemberConcern,
  uploadConcernAttachment,
} from '@/lib/memberConcerns/concerns';
import './member-concerns.css';

const CONTACT_METHODS = [
  { value: 'Text', label: 'Text message', Icon: MessageCircle },
  { value: 'Call', label: 'Phone call', Icon: Phone },
  { value: 'Email', label: 'Email', Icon: Mail },
];

const CONCERN_TYPES = ['Complain', 'Inquiries', 'Request', 'Feedback', 'Others'];

const CONCERN_AREAS = [
  { value: 'Loans', Icon: CircleDollarSign },
  { value: 'Savings & Deposits', Icon: PiggyBank },
  { value: 'Member Services', Icon: UsersRound },
  { value: 'Branch Service', Icon: Building2 },
  { value: 'Other', Icon: CircleHelp },
];

const INITIAL_FORM = {
  name: '',
  branch: '',
  phone: '',
  email: '',
  preferredContact: 'Text',
  concernType: 'Complain',
  category: 'Loans',
  message: '',
  attachment: null,
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isValidPhone = (value) => /^[+\d][\d\s().-]{6,19}$/.test(value.trim());

function ProgressSteps({ step }) {
  const labels = ['Your information', 'Your concern', 'Review & submit'];

  return (
    <ol className="concern-progress" aria-label="Submission progress">
      {labels.map((label, index) => {
        const number = index + 1;
        const state = number < step ? 'complete' : number === step ? 'current' : 'upcoming';

        return (
          <li className={`concern-progress__step is-${state}`} key={label} aria-current={number === step ? 'step' : undefined}>
            <span className="concern-progress__number">
              {number < step ? <Check size={14} aria-hidden="true" /> : number}
            </span>
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function FieldError({ children }) {
  return children ? <span className="concern-field__error" role="alert">{children}</span> : null;
}

export default function MemberConcernsPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [branchOptions, setBranchOptions] = useState([]);
  const [branchLoading, setBranchLoading] = useState(true);
  const [branchLoadError, setBranchLoadError] = useState('');
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [reference, setReference] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const selectedBranch = branchOptions.find((branch) => branch.id === form.branch) || null;

  useEffect(() => {
    let active = true;
    loadMemberConcernBranches()
      .then((branches) => {
        if (!active) return;
        setBranchOptions(branches);
        setBranchLoadError(branches.length ? '' : 'Branch destinations are currently unavailable. Please try again later.');
      })
      .catch((error) => {
        if (!active) return;
        setBranchLoadError(error.message || 'Branch destinations could not be loaded.');
      })
      .finally(() => {
        if (active) setBranchLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const validateInformation = () => {
    const nextErrors = {};
    if (!selectedBranch) nextErrors.branch = branchLoadError || 'Choose a valid office or branch.';
    if (!form.branch) nextErrors.branch = 'Choose Central Office or the branch related to your concern.';

    if (form.preferredContact === 'Email') {
      if (!form.email.trim()) nextErrors.email = 'Enter an email address for follow-up.';
      else if (!isValidEmail(form.email)) nextErrors.email = 'Enter a valid email address.';
    } else {
      if (!form.phone.trim()) nextErrors.phone = 'Enter a phone number for follow-up.';
      else if (!isValidPhone(form.phone)) nextErrors.phone = 'Enter a valid phone number.';
    }

    if (form.email.trim() && !isValidEmail(form.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (form.phone.trim() && !isValidPhone(form.phone)) {
      nextErrors.phone = 'Enter a valid phone number.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateConcern = () => {
    const nextErrors = {};
    if (!form.category) nextErrors.category = 'Choose the area related to your concern.';
    if (form.message.trim().length < 12) nextErrors.message = 'Please add a little more detail (at least 12 characters).';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goToConcern = () => {
    if (validateInformation()) setStep(2);
  };

  const goToReview = () => {
    if (validateConcern()) setStep(3);
  };

  const handleAttachment = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setErrors((current) => ({ ...current, attachment: 'Attach a PDF, JPG, or PNG file.' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((current) => ({ ...current, attachment: 'The attachment must be 10 MB or smaller.' }));
      return;
    }

    updateField('attachment', file);
  };

  const submitConcern = async (event) => {
    event.preventDefault();
    if (!privacyAccepted) {
      setErrors({ privacy: 'Please acknowledge the privacy notice to continue.' });
      return;
    }
    if (submitting) return;

    const id = createConcernReference();
    setSubmitting(true);
    setSubmitError('');

    try {
      const attachment = await uploadConcernAttachment(id, form.attachment);
      await submitMemberConcern({
        id,
        name: form.name.trim(),
        branch: selectedBranch.name,
        submissionRoute: selectedBranch.id === 'central-office' ? 'mrdss' : 'branch',
        phone: form.phone.trim(),
        email: form.email.trim(),
        preferredContact: form.preferredContact,
        concernType: form.concernType,
        category: form.category,
        message: form.message.trim(),
        attachment,
      });
      setReference(id);
    } catch (error) {
      setSubmitError(error.message || 'Your concern could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const startAnother = () => {
    setForm(INITIAL_FORM);
    setStep(1);
    setErrors({});
    setPrivacyAccepted(false);
    setReference('');
  };

  return (
    <>
      <Navbar />
      <main className="member-concern-page">
        <section className="member-concern-intro">
          <div className="member-concern-intro__inner">
            <p className="member-concern-intro__eyebrow">MEMPCO MEMBER SUPPORT</p>
            <h1>Member Concerns &amp; Feedback</h1>
            <p className="member-concern-intro__copy">
              Tell us what happened or share an idea. Choose Central Office or your branch, and we will follow up using your preferred contact method.
            </p>
          </div>
        </section>

        <section className="member-concern-content" aria-label="Submit a member concern">
          <div className="member-concern-form-shell">
            {reference ? (
              <div className="concern-success" role="status" aria-live="polite">
                <CheckCircle2 size={42} aria-hidden="true" />
                <p className="concern-kicker">SUBMISSION RECEIVED</p>
                <h2>Thank you for letting us know.</h2>
                <p className="concern-success__copy">
                  {selectedBranch?.id !== 'central-office' && selectedBranch?.hasActiveManager
                    ? `Your concern has been logged for ${selectedBranch?.name} review. Keep this reference number for follow-up.`
                    : selectedBranch?.id !== 'central-office'
                      ? `Your branch currently has no active Branch Admin, so the concern has been routed to MRDSS Central Office. Keep this reference number for follow-up.`
                      : 'Your concern has been submitted to MRDSS Central Office. Keep this reference number for follow-up.'}
                </p>
                <div className="concern-reference">
                  <span>Reference number</span>
                  <strong>{reference}</strong>
                </div>
                <button type="button" className="concern-button concern-button--primary" onClick={startAnother}>
                  Submit another concern <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <form onSubmit={submitConcern} noValidate>
                <ProgressSteps step={step} />

                {step === 1 && (
                  <section className="concern-step" aria-labelledby="concern-step-one">
                    <div className="concern-step__heading">
                      <p className="concern-kicker">STEP 1</p>
                      <h2 id="concern-step-one">Your information</h2>
                      <p>Tell us how MRDSS can reach you about this submission.</p>
                    </div>

                    <div className="concern-form-grid">
                      <div className="concern-field">
                        <label htmlFor="member-name">Full name <span className="concern-optional">Optional</span></label>
                        <input id="member-name" autoComplete="name" maxLength={120} value={form.name} onChange={(event) => updateField('name', event.target.value)} aria-invalid={Boolean(errors.name)} />
                        <FieldError>{errors.name}</FieldError>
                      </div>

                      <div className="concern-field">
                        <label htmlFor="member-branch">Send to <span aria-hidden="true">*</span></label>
                        <select id="member-branch" value={form.branch} onChange={(event) => updateField('branch', event.target.value)} aria-invalid={Boolean(errors.branch)} disabled={branchLoading || !branchOptions.length}>
                          <option value="" disabled hidden>{branchLoading ? 'Loading destinations...' : 'Choose Office or Branch'}</option>
                          {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                        </select>
                        <FieldError>{errors.branch || branchLoadError}</FieldError>
                      </div>

                      <div className="concern-field">
                        <label htmlFor="member-phone">Phone number {form.preferredContact !== 'Email' && <span aria-hidden="true">*</span>}</label>
                        <input id="member-phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={40} placeholder="09XX XXX XXXX" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} aria-invalid={Boolean(errors.phone)} />
                        <FieldError>{errors.phone}</FieldError>
                      </div>

                      <div className="concern-field">
                        <label htmlFor="member-email">Email address {form.preferredContact === 'Email' && <span aria-hidden="true">*</span>}</label>
                        <input id="member-email" type="email" autoComplete="email" inputMode="email" maxLength={254} placeholder="name@example.com" value={form.email} onChange={(event) => updateField('email', event.target.value)} aria-invalid={Boolean(errors.email)} />
                        <FieldError>{errors.email}</FieldError>
                      </div>

                      <fieldset className="concern-field concern-field--full concern-contact-choice">
                        <legend>Preferred contact method <span aria-hidden="true">*</span></legend>
                        <div className="concern-contact-choice__options">
                          {CONTACT_METHODS.map(({ value, label, Icon }) => (
                            <label className={`concern-choice ${form.preferredContact === value ? 'is-selected' : ''}`} key={value}>
                              <input type="radio" name="preferred-contact" value={value} checked={form.preferredContact === value} onChange={() => updateField('preferredContact', value)} />
                              <Icon size={18} aria-hidden="true" />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                        <span className="concern-field__hint">
                          {form.preferredContact === 'Email' ? 'MRDSS will use the email address above.' : `MRDSS will use the phone number above for a ${form.preferredContact.toLowerCase()}.`}
                        </span>
                      </fieldset>
                    </div>
                  </section>
                )}

                {step === 2 && (
                  <section className="concern-step" aria-labelledby="concern-step-two">
                    <div className="concern-step__heading">
                      <p className="concern-kicker">STEP 2</p>
                      <h2 id="concern-step-two">Your concern</h2>
                      <p>Choose what best describes your message and share the details.</p>
                    </div>

                    <fieldset className="concern-field concern-type-field">
                      <legend>What would you like to share? <span aria-hidden="true">*</span></legend>
                      <div className="concern-type-options" role="group" aria-label="Message type">
                        {CONCERN_TYPES.map((type) => (
                          <button type="button" className={`concern-type-button ${form.concernType === type ? 'is-selected' : ''}`} key={type} aria-pressed={form.concernType === type} onClick={() => updateField('concernType', type)}>
                            {type}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset className="concern-field concern-area-field">
                      <legend>Area <span aria-hidden="true">*</span></legend>
                      <div className="concern-area-options">
                        {CONCERN_AREAS.map(({ value, Icon }) => (
                          <button type="button" className={`concern-area-button ${form.category === value ? 'is-selected' : ''}`} key={value} aria-pressed={form.category === value} onClick={() => updateField('category', value)}>
                            <Icon size={21} aria-hidden="true" />
                            <span>{value}</span>
                          </button>
                        ))}
                      </div>
                      <FieldError>{errors.category}</FieldError>
                    </fieldset>

                    <div className="concern-field">
                      <label htmlFor="concern-message">Message <span aria-hidden="true">*</span></label>
                      <textarea id="concern-message" rows={5} maxLength={3000} placeholder="Describe what happened, when it happened, and what help or response you are looking for." value={form.message} onChange={(event) => updateField('message', event.target.value)} aria-invalid={Boolean(errors.message)} />
                      <div className="concern-field__meta">
                        <FieldError>{errors.message}</FieldError>
                        <span>{form.message.length}/3000</span>
                      </div>
                    </div>

                    <div className="concern-field">
                      <label htmlFor="concern-attachment">Attachment <span className="concern-optional">Optional</span></label>
                      {form.attachment ? (
                        <div className="concern-file-row">
                          <FileText size={18} aria-hidden="true" />
                          <span title={form.attachment.name}>{form.attachment.name}</span>
                          <button type="button" aria-label="Remove attachment" onClick={() => updateField('attachment', null)}><X size={17} /></button>
                        </div>
                      ) : (
                        <label htmlFor="concern-attachment" className="concern-upload">
                          <Paperclip size={19} aria-hidden="true" />
                          <span>Add a file</span>
                      <small>PDF, JPG, or PNG up to 10 MB.</small>
                        </label>
                      )}
                      <input id="concern-attachment" className="concern-file-input" type="file" accept="application/pdf,image/jpeg,image/png" onChange={handleAttachment} />
                      <FieldError>{errors.attachment}</FieldError>
                    </div>

                    <p className="concern-safety-note">
                      Please do not include passwords, PINs, or one-time codes in your message or attachment.
                    </p>
                  </section>
                )}

                {step === 3 && (
                  <section className="concern-step" aria-labelledby="concern-step-three">
                    <div className="concern-step__heading">
                      <p className="concern-kicker">STEP 3</p>
                      <h2 id="concern-step-three">Review &amp; submit</h2>
                      <p>Check your details before submitting this concern.</p>
                    </div>

                    <dl className="concern-review">
                      <div><dt>Name</dt><dd>{form.name.trim() || 'Not provided'}</dd></div>
                      <div><dt>Destination</dt><dd>{selectedBranch?.id === 'central-office' || !selectedBranch?.hasActiveManager ? 'MRDSS Central Office' : selectedBranch?.name}</dd></div>
                      <div><dt>Preferred contact</dt><dd>{form.preferredContact}</dd></div>
                      {form.phone && <div><dt>Phone</dt><dd>{form.phone}</dd></div>}
                      {form.email && <div><dt>Email</dt><dd>{form.email}</dd></div>}
                      <div><dt>Message type</dt><dd>{form.concernType}</dd></div>
                      <div><dt>Area</dt><dd>{form.category}</dd></div>
                      <div className="concern-review__message"><dt>Message</dt><dd>{form.message}</dd></div>
                      {form.attachment && <div><dt>Attachment</dt><dd>{form.attachment.name}</dd></div>}
                    </dl>

                    <label className="concern-privacy-check">
                      <input type="checkbox" checked={privacyAccepted} onChange={(event) => {
                        setPrivacyAccepted(event.target.checked);
                        setErrors((current) => ({ ...current, privacy: '' }));
                      }} />
                      <span>I acknowledge that MEMPCO may use these details to review this submission and contact me about it.</span>
                    </label>
                    <FieldError>{errors.privacy}</FieldError>
                    {submitError && <p className="concern-submit-error app-error-alert" role="alert">{submitError}</p>}
                  </section>
                )}

                <div className="concern-form-actions">
                  {step > 1 ? (
                    <button type="button" className="concern-button concern-button--secondary" onClick={() => { setErrors({}); setStep((current) => current - 1); }}>
                      <ArrowLeft size={17} aria-hidden="true" /> Back
                    </button>
                  ) : <span />}

                  {step === 1 && (
                    <button type="button" className="concern-button concern-button--primary" onClick={goToConcern}>
                      Continue <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  )}
                  {step === 2 && (
                    <button type="button" className="concern-button concern-button--primary" onClick={goToReview}>
                      Review submission <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  )}
                  {step === 3 && (
                    <button type="submit" className="concern-button concern-button--primary" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit concern'} <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
