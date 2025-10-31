import os
try:
    import boto3
except Exception:
    boto3 = None


def upload_via_cloudfront(id_token, buffer, key, content_type, prefix=""):
    """Upload bytes buffer to S3 and return a URL. If boto3 not configured, return a placeholder URL."""
    bucket = os.environ.get("S3_BUCKET_NAME")
    region = os.environ.get("AWS_REGION")
    if boto3 and bucket and region:
        s3 = boto3.client("s3")
        full_key = f"{prefix}/{key}" if prefix else key
        s3.put_object(Bucket=bucket, Key=full_key, Body=buffer, ContentType=content_type)
        return f"https://{bucket}.s3.{region}.amazonaws.com/{full_key}"
    # Fallback: return a deterministic placeholder
    return f"https://cdn.local/{prefix}/{key}" if prefix else f"https://cdn.local/{key}"


def delete_via_cloudfront(url_or_key):
    """Delete object from S3 if configured, otherwise noop for placeholder urls."""
    bucket = os.environ.get("S3_BUCKET_NAME")
    region = os.environ.get("AWS_REGION")
    if boto3 and bucket and region:
        s3 = boto3.client("s3")
        # Attempt to parse key from url
        if url_or_key.startswith("https://"):
            # naive parse
            parts = url_or_key.split("/")
            key = "/".join(parts[3:])
        else:
            key = url_or_key
        try:
            s3.delete_object(Bucket=bucket, Key=key)
        except Exception:
            pass
    return True
