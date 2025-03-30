
import { BaseService } from "./baseService";
import { Performance } from "@/types";
import { googleDriveService } from "./googleDriveService";

export interface CreatePerformanceData {
  title: string;
  description?: string;
  coverImage?: string;
  startDate?: string;
  endDate?: string;
  taggedUsers?: string[];
  createdBy: string;
}

export interface UpdatePerformanceData extends Partial<CreatePerformanceData> {
  id: string;
}

export class PerformanceService extends BaseService {
  async getPerformances(): Promise<Performance[]> {
    const { data, error } = await this.supabase
      .from("performances")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching performances:", error);
      return [];
    }
    
    return data.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description || undefined,
      coverImage: p.cover_image || undefined,
      startDate: p.start_date || undefined,
      endDate: p.end_date || undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      createdBy: p.created_by,
      taggedUsers: p.tagged_users || [],
      driveFolderId: p.drive_folder_id || undefined
    }));
  }
  
  async getPerformanceById(id: string): Promise<Performance | null> {
    console.log(`Fetching performance with ID: ${id}`);
    
    const { data, error } = await this.supabase
      .from("performances")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) {
      console.error("Error fetching performance:", error);
      return null;
    }
    
    if (!data) {
      console.error("No performance found with ID:", id);
      return null;
    }
    
    console.log("Performance data retrieved:", data);
    
    return {
      id: data.id,
      title: data.title,
      description: data.description || undefined,
      coverImage: data.cover_image || undefined,
      startDate: data.start_date || undefined,
      endDate: data.end_date || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      taggedUsers: data.tagged_users || [],
      driveFolderId: data.drive_folder_id || undefined
    };
  }
  
  async createPerformance(performanceData: CreatePerformanceData): Promise<Performance | null> {
    console.log("Creating performance with data:", performanceData);
    
    try {
      // Create folder in Google Drive
      let driveFolderId: string | null = null;
      
      try {
        console.log("Creating performance folder in Google Drive for:", performanceData.title);
        driveFolderId = await googleDriveService.createPerformanceFolder(performanceData.title);
        
        if (driveFolderId) {
          console.log(`Successfully created performance folder with ID: ${driveFolderId}`);
        } else {
          console.warn("Could not create Google Drive folder for performance. Will continue without folder ID.");
        }
      } catch (driveError) {
        console.error("Error creating Google Drive folder for performance:", driveError);
        // Continue with DB insert even if folder creation fails
      }

      // Insert performance into the database
      const { data, error } = await this.supabase
        .from("performances")
        .insert({
          title: performanceData.title,
          description: performanceData.description,
          cover_image: performanceData.coverImage,
          start_date: performanceData.startDate,
          end_date: performanceData.endDate,
          tagged_users: performanceData.taggedUsers,
          created_by: performanceData.createdBy,
          drive_folder_id: driveFolderId
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error creating performance:", error);
        return null;
      }
      
      console.log("Performance created successfully:", data);
      
      return {
        id: data.id,
        title: data.title,
        description: data.description || undefined,
        coverImage: data.cover_image || undefined,
        startDate: data.start_date || undefined,
        endDate: data.end_date || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        createdBy: data.created_by,
        taggedUsers: data.tagged_users || [],
        driveFolderId: data.drive_folder_id || undefined
      };
    } catch (error) {
      console.error("Unexpected error during performance creation:", error);
      return null;
    }
  }
  
  async updatePerformance(performanceData: UpdatePerformanceData): Promise<Performance | null> {
    const updateData: any = {};
    
    if (performanceData.title !== undefined) updateData.title = performanceData.title;
    if (performanceData.description !== undefined) updateData.description = performanceData.description;
    if (performanceData.coverImage !== undefined) updateData.cover_image = performanceData.coverImage;
    if (performanceData.startDate !== undefined) updateData.start_date = performanceData.startDate;
    if (performanceData.endDate !== undefined) updateData.end_date = performanceData.endDate;
    if (performanceData.taggedUsers !== undefined) updateData.tagged_users = performanceData.taggedUsers;
    
    const { data, error } = await this.supabase
      .from("performances")
      .update(updateData)
      .eq("id", performanceData.id)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating performance:", error);
      return null;
    }
    
    return {
      id: data.id,
      title: data.title,
      description: data.description || undefined,
      coverImage: data.cover_image || undefined,
      startDate: data.start_date || undefined,
      endDate: data.end_date || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      taggedUsers: data.tagged_users || [],
      driveFolderId: data.drive_folder_id || undefined
    };
  }
  
  async deletePerformance(id: string): Promise<boolean> {
    try {
      // Get the performance to retrieve the Drive folder ID
      const performance = await this.getPerformanceById(id);
      
      // Delete the Google Drive folder if it exists
      if (performance?.driveFolderId) {
        try {
          console.log(`Attempting to delete Google Drive folder with ID: ${performance.driveFolderId}`);
          const folderDeleted = await googleDriveService.deleteFolder(performance.driveFolderId);
          
          if (folderDeleted) {
            console.log(`Successfully deleted Google Drive folder for performance: ${id}`);
          } else {
            console.warn(`Failed to delete Google Drive folder for performance: ${id}`);
          }
        } catch (driveError) {
          console.error(`Error deleting Google Drive folder for performance ${id}:`, driveError);
          // Continue with database deletion even if folder deletion fails
        }
      }
      
      // Delete the performance from the database
      const { error } = await this.supabase
        .from("performances")
        .delete()
        .eq("id", id);
      
      if (error) {
        console.error("Error deleting performance:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Unexpected error during performance deletion:", error);
      return false;
    }
  }
}

export const performanceService = new PerformanceService();
