/**
 * PersonalInfoSection — edits the core profile fields plus photo upload.
 * Uses react-hook-form + Zod. Autosaves on explicit Save button press.
 */
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Camera, Linkedin, Github, Globe, Phone, MapPin, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import SectionCard from '../../components/profile/SectionCard.jsx';
import FormField from '../../components/forms/FormField.jsx';
import Alert from '../../components/common/Alert.jsx';
import Button from '../../components/common/Button.jsx';
import * as profileService from '../../services/profile.service.js';

const urlOpt = z.string().url('Must be a valid URL').optional().nullable().or(z.literal(''));

const schema = z.object({
  firstName:         z.string().min(2, 'At least 2 characters').max(50).trim(),
  lastName:          z.string().min(2, 'At least 2 characters').max(50).trim(),
  professionalTitle: z.string().max(100).trim().optional().nullable(),
  phone:             z.string().max(30).trim().optional().nullable(),
  location:          z.string().max(100).trim().optional().nullable(),
  linkedinUrl:       urlOpt,
  githubUrl:         urlOpt,
  portfolioUrl:      urlOpt,
  summary:           z.string().max(2000).trim().optional().nullable(),
});

const PersonalInfoSection = ({ profile, onSaved }) => {
  const [serverError, setServerError]   = useState('');
  const [successMsg,  setSuccessMsg]    = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName:         profile?.firstName         ?? '',
      lastName:          profile?.lastName          ?? '',
      professionalTitle: profile?.professionalTitle ?? '',
      phone:             profile?.phone             ?? '',
      location:          profile?.location          ?? '',
      linkedinUrl:       profile?.linkedinUrl       ?? '',
      githubUrl:         profile?.githubUrl         ?? '',
      portfolioUrl:      profile?.portfolioUrl      ?? '',
      summary:           profile?.summary           ?? '',
    },
  });

  // Sync form when parent profile data changes
  useEffect(() => {
    if (profile) {
      reset({
        firstName:         profile.firstName         ?? '',
        lastName:          profile.lastName          ?? '',
        professionalTitle: profile.professionalTitle ?? '',
        phone:             profile.phone             ?? '',
        location:          profile.location          ?? '',
        linkedinUrl:       profile.linkedinUrl       ?? '',
        githubUrl:         profile.githubUrl         ?? '',
        portfolioUrl:      profile.portfolioUrl      ?? '',
        summary:           profile.summary           ?? '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data) => {
    setServerError('');
    setSuccessMsg('');
    try {
      const res = await profileService.updateProfile(data);
      onSaved(res.data.data.profile, res.data.data.completion);
      setSuccessMsg('Personal information saved.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setServerError(err?.response?.data?.message ?? 'Failed to save. Please try again.');
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await profileService.updateProfilePhoto(fd);
      onSaved({ ...profile, photoUrl: res.data.data.photoUrl });
    } catch (err) {
      setServerError(err?.response?.data?.message ?? 'Photo upload failed.');
    } finally {
      setPhotoLoading(false);
      e.target.value = '';
    }
  };

  const initials = `${profile?.firstName?.[0] ?? ''}${profile?.lastName?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <SectionCard title="Personal Information" icon={User}>
      {/* ── Photo ── */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-brand-orange/10 flex items-center justify-center overflow-hidden border-2 border-brand-border">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-brand-orange">{initials}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={photoLoading}
            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-brand-orange rounded-full flex items-center justify-center shadow-soft hover:bg-brand-orange-dark transition-colors disabled:opacity-50"
            aria-label="Upload profile photo"
          >
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-brand-text">Profile photo</p>
          <p className="text-xs text-brand-muted mt-0.5">JPEG, PNG or WebP · Max 2 MB</p>
          {photoLoading && <p className="text-xs text-brand-orange mt-1 animate-pulse">Uploading…</p>}
        </div>
      </div>

      {serverError && <Alert type="error"   message={serverError} dismissible className="mb-4" />}
      {successMsg  && <Alert type="success" message={successMsg}            className="mb-4" />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="First name" name="firstName" placeholder="Jane" register={register} error={errors.firstName} required />
          <FormField label="Last name"  name="lastName"  placeholder="Doe"  register={register} error={errors.lastName}  required />
        </div>

        <FormField
          label="Professional title"
          name="professionalTitle"
          placeholder="e.g. Senior Software Engineer"
          register={register}
          error={errors.professionalTitle}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="form-label">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input className={`form-input pl-9 ${errors.phone ? 'form-input-error' : ''}`}
                placeholder="+1 (555) 000-0000" {...register('phone')} />
            </div>
            {errors.phone && <p className="form-error">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="form-label">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input className={`form-input pl-9 ${errors.location ? 'form-input-error' : ''}`}
                placeholder="San Francisco, CA" {...register('location')} />
            </div>
            {errors.location && <p className="form-error">{errors.location.message}</p>}
          </div>
        </div>

        {/* URLs */}
        <div className="space-y-3">
          {[
            { name: 'linkedinUrl',  Icon: Linkedin, placeholder: 'https://linkedin.com/in/yourname' },
            { name: 'githubUrl',    Icon: Github,   placeholder: 'https://github.com/yourname' },
            { name: 'portfolioUrl', Icon: Globe,    placeholder: 'https://yourportfolio.com' },
          ].map(({ name, Icon, placeholder }) => (
            <div key={name} className="space-y-1">
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  className={`form-input pl-9 ${errors[name] ? 'form-input-error' : ''}`}
                  placeholder={placeholder}
                  {...register(name)}
                />
              </div>
              {errors[name] && <p className="form-error">{errors[name].message}</p>}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="space-y-1">
          <label className="form-label flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-brand-muted" />
            Professional summary
          </label>
          <textarea
            rows={4}
            placeholder="A brief paragraph about your background, strengths, and career goals. The AI will use this when generating your resume."
            className={`form-input resize-none ${errors.summary ? 'form-input-error' : ''}`}
            {...register('summary')}
          />
          {errors.summary && <p className="form-error">{errors.summary.message}</p>}
          <p className="form-hint">Max 2000 characters. Keep it concise and impactful.</p>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={!isDirty && !isSubmitting}>
            Save changes
          </Button>
        </div>
      </form>
    </SectionCard>
  );
};

export default PersonalInfoSection;
