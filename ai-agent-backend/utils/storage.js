const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function uploadFileToSupabase(filePath, storagePath, mimeType) {
  const fileBuffer = fs.readFileSync(filePath);

  const { error } = await supabase.storage.from('documents').upload(storagePath, fileBuffer, {
    contentType: mimeType,
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabase.storage.from('documents').getPublicUrl(storagePath);
  return data.publicUrl;
}

module.exports = { uploadFileToSupabase };
