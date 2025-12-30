import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

/**
 * POST /api/instructors/[id]/photo - Upload instructor photo to Supabase Storage
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);
    const { id } = await params;
    const formData = await request.formData();
    const photoFile = formData.get("photo") as File | null;

    if (!photoFile) {
      return NextResponse.json(
        { error: "No photo file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(photoFile.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
        },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (photoFile.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Upload photo to Supabase Storage
    const fileExt = photoFile.name.split(".").pop();
    const fileName = `${id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Use "InstructorPhotos" (capital I) as per user's bucket configuration
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("InstructorPhotos")
      .upload(filePath, photoFile, {
        cacheControl: "3600",
        upsert: true, // Replace existing file if it exists
      });

    if (uploadError) {
      console.error("Error uploading instructor photo:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload photo", details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("InstructorPhotos")
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      photoUrl: urlData.publicUrl,
      filePath,
    });
  } catch (error: any) {
    console.error("Error uploading instructor photo:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
