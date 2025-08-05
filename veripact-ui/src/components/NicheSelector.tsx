// src/components/NicheSelector.tsx
"use client";

interface NicheSelectorProps {
  value: string;
  onChange: (newValue: string) => void;
}

export default function NicheSelector({ value, onChange }: NicheSelectorProps) {
  return (
    <div className="mb-4">
      <label
        htmlFor="niche"
        className="block text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        Choose niche
      </label>
      <select
        id="niche"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          mt-1
          block w-full
          rounded-md
          border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-700
          text-gray-900 dark:text-gray-100
          px-3 py-2
          focus:border-blue-500 dark:focus:border-blue-400
          focus:ring-blue-500 dark:focus:ring-blue-400
          dark:placeholder-gray-400
        "
      >
        <option value="AI & Machine Learning">AI & Machine Learning</option>
        <option value="Blockchain & Crypto Consulting">Blockchain & Crypto Consulting</option>
        <option value="Consulting">Consulting</option>
        <option value="Content Writing">Content Writing</option>
        <option value="Copywriting">Copywriting</option>
        <option value="Customer Support">Customer Support</option>
        <option value="Data Analysis">Data Analysis</option>
        <option value="Digital Marketing">Digital Marketing</option>
        <option value="Editing & Proofreading">Editing & Proofreading</option>
        <option value="Financial Advisory">Financial Advisory</option>
        <option value="General">General</option>
        <option value="Graphic Design">Graphic Design</option>
        <option value="Health & Wellness Coaching">Health & Wellness Coaching</option>
        <option value="Illustration & Animation">Illustration & Animation</option>
        <option value="Legal Services">Legal Services</option>
        <option value="Mobile App Development">Mobile App Development</option>
        <option value="Photography & Videography">Photography & Videography</option>
        <option value="Project Management">Project Management</option>
        <option value="SEO Optimization">SEO Optimization</option>
        <option value="Social Media Management">Social Media Management</option>
        <option value="Translation & Localization">Translation & Localization</option>
        <option value="UX/UI Design">UX/UI Design</option>
        <option value="Video Production">Video Production</option>
        <option value="Virtual Assistance">Virtual Assistance</option>
        <option value="Voice Over">Voice Over</option>
        <option value="Web Development">Web Development</option>

      </select>
    </div>
  );
}
