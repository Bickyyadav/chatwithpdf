import axios from "axios";

export async function uploadToCloudinary(file: File) {
    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");
        formData.append("folder", "chatwithpdf");

        // Using auto resource type to handle PDFs correctly
        const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
            formData
        );

        console.log("Cloudinary Upload Response:", response.data);
        return {
            file_key: response.data.public_id,
            file_name: response.data.original_filename,
            file_url: response.data.secure_url,
            resource_type: response.data.resource_type,
        };
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        throw error;
    }
}

export function getCloudinaryUrl(file_key: string, resource_type: "image" | "raw" | "video" | "auto" = "image") {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
        throw new Error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not configured.");
    }
    // If file_key is already a URL (some implementations do this), return it
    if (file_key.startsWith("http")) return file_key;

    // Use specific resource type
    return `https://res.cloudinary.com/${cloudName}/${resource_type}/upload/${file_key}`;
}
