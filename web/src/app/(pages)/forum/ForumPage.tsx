"use client";
import { useState } from "react";
import ForumPost from "./ForumPost";
import "./ForumPage.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/modules/auth/hooks/use-user";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import CreateForumModal from "./CreateForumModal";

interface Forum {
  _id: string;
  content: string;
  user: {
    name: string;
    _id: string;
  };
  tags: string[];
  comments: Array<{
    _id: string;
    content: string;
    user: {
      name: string;
    };
    createdAt: string;
  }>;
  likes: number;
  likesArray: string[];
  image: string;
  createdAt: string;
}

const ForumPage = () => {
  const [page] = useState(1);
  const { user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: forums } = useQuery({
    queryKey: ["forums", page],
    queryFn: async () => {
      const response = await fetchWithAuth(`/forums?page=${page}`, {
        method: "GET",
        credentials: "include",
      });
      return response.json();
    },
  });

  // 🗑️ **პოსტის წაშლის მუტაცია**
  const deleteMutation = useMutation({
    mutationFn: async (forumId: string) => {
      const response = await fetchWithAuth(`/forums/${forumId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "file-id": "requiredFileId", // აქ უნდა იქნას შესაბამისი ID
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete forum post");
      }
    },
    onSuccess: () => {
      // 🔄 წაშლის შემდეგ, განვაახლებთ ფორუმის პოსტების სიას
      queryClient.invalidateQueries({ queryKey: ["forums", page] });
    },
  });

  return (
    <div className="forum-page">
      {user && (
        <button
          className="create-post-button"
          onClick={() => setIsModalOpen(true)}
        >
          ➕ ახალი პოსტის დამატება
        </button>
      )}

      <CreateForumModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {forums?.map((forum: Forum) => {
        const isOwner = user?._id === forum.user._id;
        const isAdmin = user?.role === "admin";

        return (
          <ForumPost
            key={forum._id}
            id={forum._id}
            image={forum.image || "/avatar.jpg"}
            text={forum.content}
            category={forum.tags}
            author={{
              name: forum.user.name,
              avatar: "/avatar.jpg",
            }}
            comments={forum.comments.map((comment) => ({
              id: comment._id,
              text: comment.content,
              author: {
                name: comment.user.name,
                avatar: "/avatar.jpg",
              },
            }))}
            time={new Date(forum.createdAt).toLocaleDateString()}
            likes={forum.likes}
            isLiked={forum.likesArray.includes(user?._id || "")}
            isAuthorized={!!user}
            deleteButton={
              isOwner || isAdmin ? (
                <button
                  className="delete-post-button"
                  onClick={() => deleteMutation.mutate(forum._id)}
                >
                  🗑️ წაშლა
                </button>
              ) : null
            }
          />
        );
      })}
    </div>
  );
};

export default ForumPage;
