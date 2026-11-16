-- Ensure shopping_items table columns align with Phase 3 specifications
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_items' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_items' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.shopping_items RENAME COLUMN name TO title;
  END IF;
END $$;

ALTER TABLE public.shopping_items
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Item' CHECK (char_length(title) BETWEEN 1 AND 80),
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'groceries' CHECK (category IN ('groceries', 'household', 'cleaning', 'pantry', 'other')),
  ADD COLUMN IF NOT EXISTS quantity_label TEXT NOT NULL DEFAULT '' CHECK (char_length(quantity_label) <= 30),
  ADD COLUMN IF NOT EXISTS is_low BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'needed' CHECK (status IN ('needed', 'in_cart', 'purchased')),
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
