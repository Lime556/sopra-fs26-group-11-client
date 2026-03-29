import { ApplicationError } from "@/types/error";

export type FieldErrorMap = {
    [fieldName: string]: string;
};

export function mapApiErrorToFields(error: unknown): {
    fieldErrors?: FieldErrorMap;
    generalMessage?: string;
} {
    const err = error as Partial<ApplicationError>;
    const status = typeof err?.status === "number" ? err.status : undefined;

    const msg = error instanceof Error ? error.message.toLowerCase() : "";

    if (status === 409 || msg.includes("username already exists")) {
        return {
            fieldErrors: {
                username: "Username already exists",
            },
        };
    }

    if (status === 401 || status === 404 || msg.includes("invalid password") || msg.includes("user not found")) {
        return {
            fieldErrors: {
                password: "Wrong username or password",
            }
        };
    }

    if (status === 400) {
        if (msg.includes("username")) {
            return { 
                fieldErrors: { 
                    username: "Username must not be empty" 
                } 
            };
        }

        if (msg.includes("password")) {
            return { 
                fieldErrors: { 
                    password: "Password must not be empty" 
                } 
            };
        }
    
        return { generalMessage: "Please check your input" };
      }
    

      return {
    generalMessage: "Something went wrong. Please try again.",
  };
}