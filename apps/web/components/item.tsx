"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import { ReadableItem } from "@/lib/stores/nfts"

export interface MinterProps {
  wallet?: string;
  loading: boolean;
  nft?: ReadableItem;
  onConnectWallet: () => void;
  onDrip: () => void;
}

export function Item({
  wallet,
  onConnectWallet,
  onDrip,
  nft,
  loading,
}: MinterProps) {
  const hash = parseInt(nft?.metadata || '0' , 16) % 129
  const url = `https://dyndata.deno.dev/base/image/0xbbf5c72ac002f4f6e074c7ad47fd278deb5c740e/${hash}`
  return (
    <Card className="w-full p-4">
      <div className="mb-2">
        <h2 className="text-xl font-bold">Item</h2>
        <p className="mt-1 text-sm text-zinc-500">
          used: { nft?.locked ? '✅' : '❌' }
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Owned?: { nft?.owner === wallet ? '✅' : '❌' }
        </p>
        {/* <div className="aspect-square" >
          <iframe src="https://image.w.kodadot.xyz/ipfs/bafybeiejt552spzsegkmnifxhtzfzua7rtp6jp2zti4c6njieku6qex46y" />
        </div> */}
        {/* https://dyndata.deno.dev/base/image/0xbbf5c72ac002f4f6e074c7ad47fd278deb5c740e/0 */}
        <div className="aspect-square " >
          <img crossOrigin="anonymous" src={url} alt={'kek'} />
        </div>
        
        {/* <img crossOrigin="anonymous" src='https://imagedelivery.net/jk5b6spi_m_-9qC4VTnjpg/bafkreiawe6lurelmmpeuexv3v5rdxv3tanm6ecn4uwrwbppqgaztkepesu/public' alt={'kek'} /> */}
      </div>
      <Button
          size={"lg"}
          type="submit"
          className="mt-6 w-full"
          loading={loading}
          onClick={() => {
            wallet ?? onConnectWallet();
            wallet && onDrip();
          }}
        >
          {wallet ? "Verify 🛂" : "Connect wallet"}
        </Button>
      {/* <div className="aspect-square bg-gray-200" />
      <CardContent>
        <div className="aspect-square bg-gray-200" />
        
      </CardContent> */}
      {/* <Form {...form}>
        <div className="pt-3">
          <FormField
            name="to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  To{" "}
                  <span className="text-sm text-zinc-500">(your wallet)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    disabled
                    placeholder={wallet ?? "Please connect a wallet first"}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Button
          size={"lg"}
          type="submit"
          className="mt-6 w-full"
          loading={loading}
          onClick={() => {
            wallet ?? onConnectWallet();
            wallet && onDrip();
          }}
        >
          {wallet ? "AddPass 🎫" : "Connect wallet"}
        </Button>
      </Form> */}
    </Card>
  );
}
