import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// Secure CORS configuration
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    Deno.env.get('ALLOWED_ORIGIN'),
  ].filter(Boolean);

  const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed as string));

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

const MAX_FIELDS = 20;
const MAX_OPTIONS = 50;
const MAX_LABEL_LENGTH = 100;
const VALID_FIELD_TYPES = ['number_scale', 'single_select', 'multi_select', 'text', 'toggle'];

interface TrackerField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  order: number;
  config: any;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // JWT Authentication
  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.*)$/i);

  if (!match) {
    console.error('Missing or invalid Authorization header');
    return new Response(
      JSON.stringify({ error: 'Missing or invalid Authorization header' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const userToken = match[1];
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Verify JWT token with Supabase Auth
  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'apikey': supabaseServiceKey,
    },
  });

  if (!userResp.ok) {
    console.error('Invalid or expired token');
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const userData = await userResp.json();
  console.log('Authenticated user:', userData.id);

  console.log('=== Validate Tracker Fields Start ===');

  try {
    const body = await req.json();
    const { fields } = body;

    if (!Array.isArray(fields)) {
      throw new Error('fields must be an array');
    }

    // Validate field count
    if (fields.length > MAX_FIELDS) {
      throw new Error(`Maximum ${MAX_FIELDS} fields allowed`);
    }

    const validatedFields: TrackerField[] = [];
    const seenIds = new Set<string>();
    const seenLabels = new Set<string>();

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];

      // Validate required properties
      if (!field.id || typeof field.id !== 'string') {
        throw new Error(`Field ${i}: id is required and must be a string`);
      }

      if (seenIds.has(field.id)) {
        throw new Error(`Field ${i}: duplicate id "${field.id}"`);
      }
      seenIds.add(field.id);

      if (!field.type || !VALID_FIELD_TYPES.includes(field.type)) {
        throw new Error(
          `Field ${i}: type must be one of ${VALID_FIELD_TYPES.join(', ')}`
        );
      }

      if (!field.label || typeof field.label !== 'string') {
        throw new Error(`Field ${i}: label is required and must be a string`);
      }

      const trimmedLabel = field.label.trim();
      if (trimmedLabel.length === 0) {
        throw new Error(`Field ${i}: label cannot be empty`);
      }

      if (trimmedLabel.length > MAX_LABEL_LENGTH) {
        throw new Error(
          `Field ${i}: label exceeds maximum length of ${MAX_LABEL_LENGTH}`
        );
      }

      if (seenLabels.has(trimmedLabel.toLowerCase())) {
        throw new Error(`Field ${i}: duplicate label "${trimmedLabel}"`);
      }
      seenLabels.add(trimmedLabel.toLowerCase());

      if (typeof field.required !== 'boolean') {
        throw new Error(`Field ${i}: required must be a boolean`);
      }

      if (typeof field.order !== 'number' || field.order < 0) {
        throw new Error(`Field ${i}: order must be a non-negative number`);
      }

      if (!field.config || typeof field.config !== 'object') {
        throw new Error(`Field ${i}: config is required and must be an object`);
      }

      // Validate type-specific config
      const sanitizedConfig = validateFieldConfig(field.type, field.config, i);

      validatedFields.push({
        id: field.id,
        type: field.type,
        label: trimmedLabel,
        required: field.required,
        order: field.order,
        config: sanitizedConfig,
      });
    }

    console.log('Validation successful:', validatedFields.length, 'fields');

    return new Response(JSON.stringify({ fields: validatedFields }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

function validateFieldConfig(type: string, config: any, fieldIndex: number): any {
  if (config.type !== type) {
    throw new Error(`Field ${fieldIndex}: config.type must match field type`);
  }

  switch (type) {
    case 'number_scale':
      return validateNumberScaleConfig(config, fieldIndex);
    case 'single_select':
    case 'multi_select':
      return validateSelectConfig(config, fieldIndex);
    case 'text':
      return validateTextConfig(config, fieldIndex);
    case 'toggle':
      return validateToggleConfig(config, fieldIndex);
    default:
      throw new Error(`Field ${fieldIndex}: unknown type ${type}`);
  }
}

function validateNumberScaleConfig(config: any, fieldIndex: number) {
  const { min, max, step, labels } = config;

  if (typeof min !== 'number' || typeof max !== 'number') {
    throw new Error(`Field ${fieldIndex}: min and max must be numbers`);
  }

  if (min >= max) {
    throw new Error(`Field ${fieldIndex}: min must be less than max`);
  }

  if (typeof step !== 'number' || step <= 0) {
    throw new Error(`Field ${fieldIndex}: step must be a positive number`);
  }

  const validated: any = { type: 'number_scale', min, max, step };

  if (labels) {
    if (!Array.isArray(labels)) {
      throw new Error(`Field ${fieldIndex}: labels must be an array`);
    }
    validated.labels = labels
      .filter((l: any) => typeof l === 'string' && l.trim())
      .map((l: string) => l.trim())
      .slice(0, 10); // Max 10 labels
  }

  return validated;
}

function validateSelectConfig(config: any, fieldIndex: number) {
  const { options } = config;

  if (!Array.isArray(options)) {
    throw new Error(`Field ${fieldIndex}: options must be an array`);
  }

  if (options.length === 0) {
    throw new Error(`Field ${fieldIndex}: options cannot be empty`);
  }

  if (options.length > MAX_OPTIONS) {
    throw new Error(
      `Field ${fieldIndex}: options exceed maximum of ${MAX_OPTIONS}`
    );
  }

  const sanitizedOptions = options
    .filter((opt: any) => typeof opt === 'string' && opt.trim())
    .map((opt: string) => opt.trim())
    .slice(0, MAX_OPTIONS);

  if (sanitizedOptions.length === 0) {
    throw new Error(`Field ${fieldIndex}: no valid options provided`);
  }

  // Check for duplicates
  const uniqueOptions = [...new Set(sanitizedOptions)];
  if (uniqueOptions.length !== sanitizedOptions.length) {
    throw new Error(`Field ${fieldIndex}: duplicate options found`);
  }

  return {
    type: config.type,
    options: sanitizedOptions,
  };
}

function validateTextConfig(config: any, fieldIndex: number) {
  const { multiline, placeholder } = config;

  if (typeof multiline !== 'boolean') {
    throw new Error(`Field ${fieldIndex}: multiline must be a boolean`);
  }

  const validated: any = { type: 'text', multiline };

  if (placeholder && typeof placeholder === 'string') {
    validated.placeholder = placeholder.trim().slice(0, 100);
  }

  return validated;
}

function validateToggleConfig(config: any, fieldIndex: number) {
  const { onLabel, offLabel } = config;

  const validated: any = { type: 'toggle' };

  if (onLabel && typeof onLabel === 'string') {
    validated.onLabel = onLabel.trim().slice(0, 50);
  }

  if (offLabel && typeof offLabel === 'string') {
    validated.offLabel = offLabel.trim().slice(0, 50);
  }

  return validated;
}
