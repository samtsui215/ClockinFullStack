// components/AuthForm.tsx
"use client";


import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import { Form } from "./ui/form";
import FormField from "./FormField";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase/client";
import { signIn } from "@/lib/actions/auth.action";

// Define the props
type AuthFormType = "sign-in" | "sign-up";

interface AuthFormProps {
  type: AuthFormType;
}

// Zod schema
const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});

const AuthForm = ({ type }: AuthFormProps) => {
  const router = useRouter();
  const form = useForm<z.infer<typeof authFormSchema>>({
    resolver: zodResolver(authFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof authFormSchema>) {
    try {
      const { email, password } = values;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      if (!idToken) {
        toast.error(`${type === "sign-in" ? "Sign in" : "Sign up"} failed`);
        return;
      }

      await signIn({ email, idToken });
      toast.success(`${type === "sign-in" ? "Signed in" : "Signed up"} successfully`);
      router.push("/dashboard"); // redirect to your protected page
    } catch (error) {
      console.error(error);
      toast.error(`There was an error: ${error}`);
    }
  }

  return (
    <div className="card-boarder lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">
        <div className="flex flex-row gap-2 justify-center">
          {/* <Image src="/logo.svg" alt="logo" height={32} width={38} /> */}
          <h2 className="text-primary-100">ClockIn System</h2>
        </div>
        <h3>{type === "sign-in" ? "Please sign in" : "Create an account"}</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6 mt-4 form">
            <FormField
              control={form.control}
              name="email"
              label="Email"
              placeholder="Your Email Address"
              type="email"
            />
            <FormField
              control={form.control}
              name="password"
              label="Password"
              placeholder="Enter Your Password"
              type="password"
            />
            <Button className="btn" type="submit">
              {type === "sign-in" ? "Sign In" : "Sign Up"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default AuthForm;
