-- Create a function to increment news views
CREATE OR REPLACE FUNCTION increment_news_views(news_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE campus_news
  SET views = COALESCE(views, 0) + 1
  WHERE id = news_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_news_views(UUID) TO authenticated;
